
import { GameState, PlayerClass, Player, GameStatus, World, CustomVoice, GameMessage, Item, ItemType, SaveSlotMeta } from './types';
import { CLASS_CONFIG, HEALING_POTION } from './constants';
import { ELEVENLABS_VOICES } from '../services/elevenLabsService';

// ── Save-slot storage keys ──────────────────────────────────────────────────
export const SAVE_INDEX_KEY = 'geminiRealmsSaveIndex';
export const SAVE_PREFIX = 'geminiRealmsSave:';
export const AUTOSAVE_ID = '__autosave__';
const LEGACY_SAVE_KEY = 'geminiRealmsSave';

// ── Save index helpers (exported so Settings can read slots) ────────────────
export const readSaveIndex = (): SaveSlotMeta[] => {
    try {
        const stored = localStorage.getItem(SAVE_INDEX_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const writeSaveIndex = (index: SaveSlotMeta[]): void => {
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
};

export const loadSaveState = (id: string): GameState | null => {
    try {
        const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

/** One-time migration: move the old single-slot save into the new index. */
const migrateLegacySave = (): SaveSlotMeta[] => {
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    const existingIndex = readSaveIndex();

    if (!legacy) return existingIndex;

    try {
        const parsed: GameState = JSON.parse(legacy);
        const alreadyMigrated = existingIndex.some(s => s.id === 'migrated');
        if (!alreadyMigrated) {
            const meta: SaveSlotMeta = {
                id: 'migrated',
                name: 'Recovered Save',
                timestamp: Date.now(),
                playerClass: parsed.player.class,
                playerLevel: parsed.player.level,
                locationName: parsed.world.rooms[parsed.player.location]?.name ?? 'Unknown',
                isAutoSave: false,
            };
            const newIndex = [meta, ...existingIndex];
            writeSaveIndex(newIndex);
            localStorage.setItem(`${SAVE_PREFIX}migrated`, legacy);
            localStorage.removeItem(LEGACY_SAVE_KEY);
            return newIndex;
        }
    } catch { /* malformed legacy save — just discard */ }

    localStorage.removeItem(LEGACY_SAVE_KEY);
    return existingIndex;
};

export const initialPlayerState: Player = {
  name: 'Adventurer',
  class: PlayerClass.Warrior,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  hp: 100,
  maxHp: 100,
  attack: 10,
  defense: 5,
  inventory: [],
  location: 'barracks', // This will be overwritten
  equipped: { weapon: null, armor: null },
};

const getCustomVoicesFromStorage = (): CustomVoice[] => {
    try {
        const stored = localStorage.getItem('geminiRealmsCustomVoices');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse custom voices from storage:", e);
        return [];
    }
};

/**
 * Creates a fresh game state object, reading all persistent settings from localStorage.
 * This is used for the initial application load via useReducer lazy initialization.
 */
export const getFreshGameState = (): GameState => {
    // Default settings values
    const defaults = {
        narrationEnabled: false,
        narrationVoiceId: ELEVENLABS_VOICES[0]?.id || 'default',
        systemVoiceId: ELEVENLABS_VOICES[2]?.id || 'default',
        impEnabled: false,
        impVoiceId: ELEVENLABS_VOICES[3]?.id || 'default',
        ambientSoundEnabled: false,
        ambientSoundVolume: 0.5,
    };

    const getBool = (key: string, defaultVal: boolean): boolean => {
        const val = localStorage.getItem(key);
        return val === null ? defaultVal : val === 'true';
    };

    const getString = (key: string, defaultVal: string | null = null): string | null => {
        return localStorage.getItem(key) || defaultVal;
    };

    const storedVolume = localStorage.getItem('geminiRealmsAmbientSoundVolume');
    
    return {
        player: initialPlayerState,
        world: { rooms: {} },
        log: [{ text: 'Welcome to Gemini Realms. Choose your class to begin.', type: 'system' }],
        gameStatus: GameStatus.StartScreen,
        currentImage: null,
        isLoadingImage: false,
        lastLocation: null,
        isProcessingCommand: false,
        actionsSinceProgress: 0,
        visitedRooms: [],
        isMapOpen: false,
        saveIndex: migrateLegacySave(),
        // --- Persistent Settings ---
        narrationEnabled: getBool('geminiRealmsNarrationEnabled', defaults.narrationEnabled),
        elevenLabsApiKey: getString('geminiRealmsElevenLabsKey'),
        narrationVoiceId: getString('geminiRealmsNarrationVoiceId', defaults.narrationVoiceId)!,
        systemVoiceId: getString('geminiRealmsSystemVoiceId', defaults.systemVoiceId)!,
        customVoices: getCustomVoicesFromStorage(),
        impEnabled: getBool('geminiRealmsImpEnabled', defaults.impEnabled),
        impVoiceId: getString('geminiRealmsImpVoiceId', defaults.impVoiceId)!,
        ambientSoundEnabled: getBool('geminiRealmsAmbientSoundEnabled', defaults.ambientSoundEnabled),
        ambientSoundVolume: storedVolume !== null ? parseFloat(storedVolume) : defaults.ambientSoundVolume,
        pixabayApiKey: getString('geminiRealmsPixabayKey'),
        // --- Transient State ---
        currentAmbientSoundUrl: null,
    };
};

/**
 * A utility to extract only the settings from a GameState object.
 */
const extractSettings = (state: GameState) => ({
    narrationEnabled: state.narrationEnabled,
    elevenLabsApiKey: state.elevenLabsApiKey,
    narrationVoiceId: state.narrationVoiceId,
    systemVoiceId: state.systemVoiceId,
    customVoices: state.customVoices,
    impEnabled: state.impEnabled,
    impVoiceId: state.impVoiceId,
    ambientSoundEnabled: state.ambientSoundEnabled,
    ambientSoundVolume: state.ambientSoundVolume,
    pixabayApiKey: state.pixabayApiKey,
});


export const initialGameState: GameState = getFreshGameState();

type Action =
  | { type: 'NEW_GAME'; payload: { playerClass: PlayerClass, world: World, startingLocation: string, startingNarration: string } }
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'SAVE_TO_SLOT'; payload: { name: string; isAutoSave: boolean } }
  | { type: 'DELETE_SLOT'; payload: string }
  | { type: 'UPDATE_STATE'; payload: GameState }
  | { type: 'SET_CURRENT_IMAGE'; payload: string }
  | { type: 'SET_LOADING_IMAGE'; payload: boolean }
  | { type: 'UPDATE_LAST_LOCATION', payload: string }
  | { type: 'START_COMMAND_PROCESSING' }
  | { type: 'END_COMMAND_PROCESSING' }
  | { type: 'RESTART' }
  | { type: 'ADD_LOG_MESSAGE'; payload: GameMessage }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameState> }
  | { type: 'SET_NARRATION_ENABLED'; payload: boolean }
  | { type: 'SET_ELEVENLABS_API_KEY'; payload: string | null }
  | { type: 'SET_NARRATION_VOICE_ID'; payload: string }
  | { type: 'SET_SYSTEM_VOICE_ID'; payload: string }
  | { type: 'ADD_CUSTOM_VOICE'; payload: CustomVoice }
  | { type: 'REMOVE_CUSTOM_VOICE'; payload: string } // payload is voice id
  | { type: 'SET_IMP_ENABLED'; payload: boolean }
  | { type: 'SET_IMP_VOICE_ID'; payload: string }
  | { type: 'SET_AMBIENT_SOUND_ENABLED'; payload: boolean }
  | { type: 'SET_AMBIENT_SOUND_VOLUME'; payload: number }
  | { type: 'SET_PIXABAY_API_KEY'; payload: string | null }
  | { type: 'SET_CURRENT_AMBIENT_SOUND_URL'; payload: string | null }
  | { type: 'EQUIP_ITEM'; payload: Item }
  | { type: 'UNEQUIP_ITEM'; payload: Item }
  | { type: 'TOGGLE_MAP'; payload: boolean };

export const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'NEW_GAME': {
      const { playerClass, world, startingLocation, startingNarration } = action.payload;
      const config = CLASS_CONFIG[playerClass];
      const newPlayer: Player = {
        ...initialPlayerState,
        class: playerClass,
        hp: config.baseHp,
        maxHp: config.baseHp,
        attack: config.baseAttack,
        defense: config.baseDefense,
        location: startingLocation,
        inventory: [config.startingWeapon, config.startingArmor, HEALING_POTION],
        equipped: { weapon: config.startingWeapon, armor: config.startingArmor },
      };

      // Preserve settings from the current state, but reset all gameplay state.
      return {
        ...state, // This preserves the current settings
        player: newPlayer,
        world: world,
        gameStatus: GameStatus.Playing,
        log: [
            { text: `You awaken as a ${playerClass}.`, type: 'system' },
            { text: startingNarration, type: 'normal' }
        ],
        visitedRooms: [startingLocation],
        // Reset transient gameplay state
        currentImage: null,
        isLoadingImage: true,
        lastLocation: null,
        isProcessingCommand: false,
        actionsSinceProgress: 0,
        currentAmbientSoundUrl: null,
        isMapOpen: false,
      };
    }
    case 'LOAD_GAME': {
      const savedProgress = action.payload;
      // Use current settings and save index from memory — don't overwrite with saved values
      const currentSettings = extractSettings(state);

      return {
          ...savedProgress,
          ...currentSettings,
          saveIndex: state.saveIndex,   // always keep the live index
          gameStatus: GameStatus.Playing,
          isLoadingImage: true,
          lastLocation: null,
          isProcessingCommand: false,
          currentAmbientSoundUrl: null,
          isMapOpen: false,
      };
    }
    case 'SAVE_TO_SLOT': {
      const { name, isAutoSave } = action.payload;
      const id = isAutoSave ? AUTOSAVE_ID : `save_${Date.now()}`;
      const currentRoom = state.world.rooms[state.player.location];

      const meta: SaveSlotMeta = {
          id,
          name,
          timestamp: Date.now(),
          playerClass: state.player.class,
          playerLevel: state.player.level,
          locationName: currentRoom?.name ?? 'Unknown',
          isAutoSave,
      };

      // Persist state (strip the saveIndex to avoid stale nested copies)
      const { saveIndex: _omit, ...stateToSave } = state;
      localStorage.setItem(`${SAVE_PREFIX}${id}`, JSON.stringify(stateToSave));

      // Update the index (replace existing entry with same id, then prepend)
      const filtered = state.saveIndex.filter(s => s.id !== id);
      const newIndex = [meta, ...filtered];
      writeSaveIndex(newIndex);

      const logMsg = isAutoSave ? 'Game auto-saved.' : `Game saved: "${name}".`;
      return { ...state, saveIndex: newIndex, log: [...state.log, { text: logMsg, type: 'system' }] };
    }
    case 'DELETE_SLOT': {
      const id = action.payload;
      localStorage.removeItem(`${SAVE_PREFIX}${id}`);
      const newIndex = state.saveIndex.filter(s => s.id !== id);
      writeSaveIndex(newIndex);
      return { ...state, saveIndex: newIndex };
    }
    case 'UPDATE_STATE':
        return action.payload;
    case 'SET_CURRENT_IMAGE':
      return { ...state, currentImage: action.payload };
    case 'SET_LOADING_IMAGE':
      return { ...state, isLoadingImage: action.payload };
    case 'UPDATE_LAST_LOCATION':
        return { ...state, lastLocation: action.payload };
    case 'START_COMMAND_PROCESSING':
        return { ...state, isProcessingCommand: true };
    case 'END_COMMAND_PROCESSING':
        return { ...state, isProcessingCommand: false };
    case 'RESTART': {
        // Return to the start screen, preserving settings and save index but resetting gameplay.
        return {
            ...state,
            player: initialPlayerState,
            world: { rooms: {} },
            log: [{ text: 'Welcome to Gemini Realms. Choose your class to begin.', type: 'system' }],
            gameStatus: GameStatus.StartScreen,
            currentImage: null,
            isLoadingImage: false,
            lastLocation: null,
            isProcessingCommand: false,
            actionsSinceProgress: 0,
            visitedRooms: [],
            currentAmbientSoundUrl: null,
            isMapOpen: false,
        };
    }
    case 'ADD_LOG_MESSAGE': {
      const newLog = [...state.log, action.payload];
      if (newLog.length > 100) {
        newLog.shift();
      }
      return { ...state, log: newLog };
    }
    case 'UPDATE_SETTINGS': {
        const newState = { ...state, ...action.payload };
        
        // Persist each changed setting to localStorage explicitly
        const settingsPayload = action.payload;
        
        if (settingsPayload.narrationEnabled !== undefined) 
            localStorage.setItem('geminiRealmsNarrationEnabled', String(settingsPayload.narrationEnabled));
            
        if (settingsPayload.elevenLabsApiKey !== undefined) {
            if (settingsPayload.elevenLabsApiKey) localStorage.setItem('geminiRealmsElevenLabsKey', settingsPayload.elevenLabsApiKey);
            else localStorage.removeItem('geminiRealmsElevenLabsKey');
        }
        
        if (settingsPayload.narrationVoiceId !== undefined) 
            localStorage.setItem('geminiRealmsNarrationVoiceId', settingsPayload.narrationVoiceId);
            
        if (settingsPayload.systemVoiceId !== undefined) 
            localStorage.setItem('geminiRealmsSystemVoiceId', settingsPayload.systemVoiceId);
            
        if (settingsPayload.impEnabled !== undefined) 
            localStorage.setItem('geminiRealmsImpEnabled', String(settingsPayload.impEnabled));
            
        if (settingsPayload.impVoiceId !== undefined) 
            localStorage.setItem('geminiRealmsImpVoiceId', settingsPayload.impVoiceId);
            
        if (settingsPayload.ambientSoundEnabled !== undefined) 
            localStorage.setItem('geminiRealmsAmbientSoundEnabled', String(settingsPayload.ambientSoundEnabled));
            
        if (settingsPayload.ambientSoundVolume !== undefined) 
            localStorage.setItem('geminiRealmsAmbientSoundVolume', String(settingsPayload.ambientSoundVolume));
            
        if (settingsPayload.pixabayApiKey !== undefined) {
            if (settingsPayload.pixabayApiKey) localStorage.setItem('geminiRealmsPixabayKey', settingsPayload.pixabayApiKey);
            else localStorage.removeItem('geminiRealmsPixabayKey');
        }
        
        return newState;
    }
    case 'SET_NARRATION_ENABLED':
        localStorage.setItem('geminiRealmsNarrationEnabled', action.payload.toString());
        return { ...state, narrationEnabled: action.payload };
    case 'SET_ELEVENLABS_API_KEY':
        if (action.payload) {
            localStorage.setItem('geminiRealmsElevenLabsKey', action.payload);
        } else {
            localStorage.removeItem('geminiRealmsElevenLabsKey');
        }
        return { ...state, elevenLabsApiKey: action.payload };
    case 'SET_NARRATION_VOICE_ID':
        localStorage.setItem('geminiRealmsNarrationVoiceId', action.payload);
        return { ...state, narrationVoiceId: action.payload };
    case 'SET_SYSTEM_VOICE_ID':
        localStorage.setItem('geminiRealmsSystemVoiceId', action.payload);
        return { ...state, systemVoiceId: action.payload };
    case 'ADD_CUSTOM_VOICE': {
        const newVoices = [...state.customVoices, action.payload];
        localStorage.setItem('geminiRealmsCustomVoices', JSON.stringify(newVoices));
        return { ...state, customVoices: newVoices };
    }
    case 'REMOVE_CUSTOM_VOICE': {
        const idToRemove = action.payload;
        const newVoices = state.customVoices.filter(v => v.id !== idToRemove);
        localStorage.setItem('geminiRealmsCustomVoices', JSON.stringify(newVoices));

        const newNarrationVoiceId = state.narrationVoiceId === idToRemove ? ELEVENLABS_VOICES[0].id : state.narrationVoiceId;
        const newSystemVoiceId = state.systemVoiceId === idToRemove ? ELEVENLABS_VOICES[2].id : state.systemVoiceId;
        const newImpVoiceId = state.impVoiceId === idToRemove ? ELEVENLABS_VOICES[3].id : state.impVoiceId;
        
        if (newNarrationVoiceId !== state.narrationVoiceId) {
            localStorage.setItem('geminiRealmsNarrationVoiceId', newNarrationVoiceId);
        }
        if (newSystemVoiceId !== state.systemVoiceId) {
            localStorage.setItem('geminiRealmsSystemVoiceId', newSystemVoiceId);
        }
        if (newImpVoiceId !== state.impVoiceId) {
            localStorage.setItem('geminiRealmsImpVoiceId', newImpVoiceId);
        }

        return {
            ...state,
            customVoices: newVoices,
            narrationVoiceId: newNarrationVoiceId,
            systemVoiceId: newSystemVoiceId,
            impVoiceId: newImpVoiceId,
        };
    }
    case 'SET_IMP_ENABLED':
        localStorage.setItem('geminiRealmsImpEnabled', action.payload.toString());
        return { ...state, impEnabled: action.payload };
    case 'SET_IMP_VOICE_ID':
        localStorage.setItem('geminiRealmsImpVoiceId', action.payload);
        return { ...state, impVoiceId: action.payload };
    case 'SET_AMBIENT_SOUND_ENABLED':
        localStorage.setItem('geminiRealmsAmbientSoundEnabled', action.payload.toString());
        return { ...state, ambientSoundEnabled: action.payload };
    case 'SET_AMBIENT_SOUND_VOLUME':
        localStorage.setItem('geminiRealmsAmbientSoundVolume', action.payload.toString());
        return { ...state, ambientSoundVolume: action.payload };
    case 'SET_PIXABAY_API_KEY':
        if (action.payload) {
            localStorage.setItem('geminiRealmsPixabayKey', action.payload);
        } else {
            localStorage.removeItem('geminiRealmsPixabayKey');
        }
        return { ...state, pixabayApiKey: action.payload };
    case 'SET_CURRENT_AMBIENT_SOUND_URL':
        return { ...state, currentAmbientSoundUrl: action.payload };
    case 'EQUIP_ITEM': {
        const itemToEquip = action.payload;
        const newEquipped = { ...state.player.equipped };
        let logMessage = `You equipped ${itemToEquip.name}.`;

        if (itemToEquip.type === ItemType.Weapon) {
            if(newEquipped.weapon) {
                logMessage = `You unequip ${newEquipped.weapon.name} and equip ${itemToEquip.name}.`;
            }
            newEquipped.weapon = itemToEquip;
        } else if (itemToEquip.type === ItemType.Armor) {
            if(newEquipped.armor) {
                logMessage = `You unequip ${newEquipped.armor.name} and equip ${itemToEquip.name}.`;
            }
            newEquipped.armor = itemToEquip;
        } else {
            return { ...state, log: [...state.log, { text: `You cannot equip ${itemToEquip.name}.`, type: 'error' }]};
        }
        
        const newPlayer = { ...state.player, equipped: newEquipped };
        return { ...state, player: newPlayer, log: [...state.log, { text: logMessage, type: 'system' }] };
    }
    case 'UNEQUIP_ITEM': {
        const itemToUnequip = action.payload;
        const newEquipped = { ...state.player.equipped };
        let changed = false;

        if (itemToUnequip.type === ItemType.Weapon && newEquipped.weapon?.id === itemToUnequip.id) {
            newEquipped.weapon = null;
            changed = true;
        } else if (itemToUnequip.type === ItemType.Armor && newEquipped.armor?.id === itemToUnequip.id) {
            newEquipped.armor = null;
            changed = true;
        }

        if (changed) {
            const newPlayer = { ...state.player, equipped: newEquipped };
            return { ...state, player: newPlayer, log: [...state.log, { text: `You unequipped ${itemToUnequip.name}.`, type: 'system' }] };
        }
        
        return state;
    }
    case 'TOGGLE_MAP':
        return { ...state, isMapOpen: action.payload };
    default:
      return state;
  }
};
