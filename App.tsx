


import React, { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { GameScreen } from './components/GameScreen';
import { StartScreen } from './components/StartScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { GameState, PlayerClass, GameMessage, GameStatus } from './game/types';
import { gameReducer, getFreshGameState, loadSaveState, AUTOSAVE_ID } from './game/reducer';
import { generateImage, initializeGame, getAmbientSoundQuery } from './services/aiService';
import { processCommand } from './game/engine';
import { getNarrationAudio } from './services/elevenLabsService';
import { searchSounds } from './services/pixabayService';

const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Custom hook for managing the narration audio queue
const useNarrationQueue = (
    state: GameState,
    dispatch: React.Dispatch<any>
) => {
    const { 
        log, 
        narrationEnabled, 
        elevenLabsApiKey, 
        narrationVoiceId, 
        systemVoiceId,
        impEnabled,
        impVoiceId
    } = state;

    const [queue, setQueue] = useState<{ text: string; voiceId: string }[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const logLengthRef = useRef(log.length);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Effect to add new, narratable messages to the queue
    useEffect(() => {
        if (narrationEnabled && elevenLabsApiKey && log.length > logLengthRef.current) {
            const newMessages = log.slice(logLengthRef.current);
            const narratableItems = newMessages
                .map(msg => {
                    if (msg.type === 'imp' && impEnabled) {
                        return { text: msg.text, voiceId: impVoiceId };
                    }
                    if (['normal', 'system', 'loot', 'combat_player', 'combat_enemy', 'error', 'hint'].includes(msg.type)) {
                        const isSystemMessage = ['system', 'loot', 'combat_player', 'combat_enemy', 'error', 'hint'].includes(msg.type);
                        return { text: msg.text, voiceId: isSystemMessage ? systemVoiceId : narrationVoiceId };
                    }
                    return null;
                })
                .filter(item => item !== null) as { text: string; voiceId: string }[];
            
            if (narratableItems.length > 0) {
                setQueue(prevQueue => [...prevQueue, ...narratableItems]);
            }
        }
        logLengthRef.current = log.length;
    }, [log, narrationEnabled, elevenLabsApiKey, narrationVoiceId, systemVoiceId, impEnabled, impVoiceId]);

    // Effect to process the audio queue
    useEffect(() => {
        if (!isPlaying && queue.length > 0 && narrationEnabled && elevenLabsApiKey) {
            setIsPlaying(true);
            const { text, voiceId: itemVoiceId } = queue[0];
            
            // Initialize AudioContext on user interaction
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const audioContext = audioContextRef.current;
            
            getNarrationAudio(text, elevenLabsApiKey, audioContext, itemVoiceId)
                .then(audioBuffer => {
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.start();
                    source.onended = () => {
                        setQueue(prevQueue => prevQueue.slice(1));
                        setIsPlaying(false);
                    };
                })
                .catch(error => {
                    console.error("Narration error:", error);
                    // Check for any API key related error from our service
                    if (error instanceof Error && error.message.startsWith('ElevenLabs API Error:')) {
                        const specificError = error.message.replace('ElevenLabs API Error: ', '');
                        dispatch({
                            type: 'ADD_LOG_MESSAGE',
                            payload: {
                                text: `Narration Error: ${specificError} Narration has been disabled.`,
                                type: 'error'
                            }
                        });
                        console.error("Specific ElevenLabs error:", error.message);
                        dispatch({ type: 'SET_NARRATION_ENABLED', payload: false });
                    }
                    // Skip this item and continue
                    setQueue(prevQueue => prevQueue.slice(1));
                    setIsPlaying(false);
                });
        }
    }, [queue, isPlaying, narrationEnabled, elevenLabsApiKey, dispatch]);
};

// Custom hook for managing ambient sound
const useAmbientSound = (state: GameState, dispatch: React.Dispatch<any>) => {
    const { 
        player: { location }, 
        lastLocation,
        world,
        ambientSoundEnabled, 
        pixabayApiKey,
        currentAmbientSoundUrl,
        ambientSoundVolume
    } = state;
    
    const audioRef = useRef<HTMLAudioElement>(null);

    // Effect to fetch new sound on location change
    useEffect(() => {
        if (ambientSoundEnabled && pixabayApiKey && location !== lastLocation) {
            const fetchSound = async () => {
                const room = world.rooms[location];
                if (!room) return;

                try {
                    const query = await getAmbientSoundQuery(room);
                    const soundUrl = await searchSounds(query, pixabayApiKey);
                    dispatch({ type: 'SET_CURRENT_AMBIENT_SOUND_URL', payload: soundUrl });
                } catch (error) {
                    console.error("Failed to fetch ambient sound:", error);
                    dispatch({ type: 'SET_CURRENT_AMBIENT_SOUND_URL', payload: null });
                }
            };
            fetchSound();
        }
    }, [location, lastLocation, ambientSoundEnabled, pixabayApiKey, world.rooms, dispatch]);
    
    // Effect to control audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (ambientSoundEnabled && currentAmbientSoundUrl) {
            if (audio.src !== currentAmbientSoundUrl) {
                audio.src = currentAmbientSoundUrl;
            }
            audio.play().catch(e => console.error("Audio playback failed:", e));
        } else {
            audio.pause();
            if (currentAmbientSoundUrl === null && audio.src) {
              audio.removeAttribute('src');
              audio.load();
            }
        }
    }, [currentAmbientSoundUrl, ambientSoundEnabled]);

    // Effect to control volume
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = ambientSoundVolume;
        }
    }, [ambientSoundVolume]);

    // Return the audio element to be rendered
    return <audio ref={audioRef} loop crossOrigin="anonymous" />;
};


const App: React.FC = () => {
  // Use lazy initialization for useReducer to ensure we get fresh settings from localStorage
  const [state, dispatch] = useReducer(gameReducer, null, getFreshGameState);
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const ambientAudioElement = useAmbientSound(state, dispatch);

  useNarrationQueue(state, dispatch);

  // ── Auto-save timer (5 min) ─────────────────────────────────────────────
  // Use refs so the interval closure doesn't go stale without re-registering.
  const gameStatusRef = useRef(state.gameStatus);
  const isProcessingRef = useRef(state.isProcessingCommand);
  useEffect(() => { gameStatusRef.current = state.gameStatus; }, [state.gameStatus]);
  useEffect(() => { isProcessingRef.current = state.isProcessingCommand; }, [state.isProcessingCommand]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameStatusRef.current === GameStatus.Playing && !isProcessingRef.current) {
        dispatch({ type: 'SAVE_TO_SLOT', payload: { name: 'Auto-save', isAutoSave: true } });
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // intentionally empty — runs once, reads via refs

  const handleNewGame = useCallback(async (playerClass: PlayerClass) => {
    setIsGeneratingWorld(true);
    try {
        const { world, startingLocation, startingNarration } = await initializeGame(playerClass);
        dispatch({ 
            type: 'NEW_GAME', 
            payload: { playerClass, world, startingLocation, startingNarration } 
        });
    } catch (error) {
        console.error("Failed to generate world:", error);
        alert("A cosmic anomaly prevented the world from being born. Please try again.");
    } finally {
        setIsGeneratingWorld(false);
    }
  }, []);

  const handleLoadGame = useCallback(() => {
    // Load the most recent save (index is sorted newest-first).
    const index = state.saveIndex;
    if (index.length === 0) {
      alert("No saved games found!");
      return;
    }
    const mostRecent = index[0];
    const savedState = loadSaveState(mostRecent.id);
    if (savedState) {
      dispatch({ type: 'LOAD_GAME', payload: savedState });
    } else {
      alert("Save data could not be read.");
    }
  }, [state.saveIndex]);
  
  const handleCommand = useCallback(async (command: string) => {
      if(state.isProcessingCommand) return;
      dispatch({ type: 'START_COMMAND_PROCESSING' });
      const commandState = { ...state, log: [...state.log, { text: `> ${command}`, type: 'player_action' as const }]};
      dispatch({ type: 'UPDATE_STATE', payload: commandState });
      try {
        const newState = await processCommand(command, commandState);
        dispatch({ type: 'UPDATE_STATE', payload: newState });
      } catch (error) {
        console.error("CRITICAL ERROR processing command:", error);
        // If it's a specific error we can identify, maybe show more info
        let errorMessage = "A mysterious force prevented that action. The world seems to have rejected your attempt.";
        if (error instanceof Error) {
            console.error("Error stack:", error.stack);
            // Check for common issues
            if (error.message.includes("API_KEY")) {
                errorMessage = "The cosmic connection is severed (Missing API Key). Please check your configuration.";
            }
        }
        
        const errorState = {
          ...state,
          log: [...state.log, { text: errorMessage, type: 'error' as const }]
        };
        dispatch({ type: 'UPDATE_STATE', payload: errorState });
      } finally {
        dispatch({ type: 'END_COMMAND_PROCESSING' });
      }
  }, [state]);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  useEffect(() => {
    const fetchImage = async () => {
      const room = state.world.rooms[state.player.location];
      if (!room) return;
      
      dispatch({ type: 'SET_LOADING_IMAGE', payload: true });
      try {
        const prompt = `Epic fantasy art, digital painting, a scene from a text-based RPG. The location is a ${room.name}. Description: ${room.description}. Items in the room include: ${room.items.map(i => i.name).join(', ')}. The style should be atmospheric and slightly dark, like a classic fantasy illustration.`;
        const imageUrl = await generateImage(prompt);
        dispatch({ type: 'SET_CURRENT_IMAGE', payload: imageUrl });
      } catch (error) {
        console.error("Failed to generate image:", error);
      } finally {
        dispatch({ type: 'SET_LOADING_IMAGE', payload: false });
      }
    };

    if (state.gameStatus === 'playing' && state.lastLocation !== state.player.location) {
      fetchImage();
      dispatch({ type: 'UPDATE_LAST_LOCATION', payload: state.player.location });
    }
  }, [state.player.location, state.gameStatus, state.lastLocation]);

  const renderContent = () => {
    switch (state.gameStatus) {
      case 'start_screen':
        const hasSave = state.saveIndex.length > 0;
        return <StartScreen onNewGame={handleNewGame} onLoadGame={handleLoadGame} hasSaveGame={hasSave} isGeneratingWorld={isGeneratingWorld} />;
      case 'playing':
        return <GameScreen gameState={state} onCommand={handleCommand} dispatch={dispatch} />;
      case 'game_over':
        return <GameOverScreen onRestart={handleRestart} />;
      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-200">
      {ambientAudioElement}
      {renderContent()}
    </div>
  );
};

export default App;