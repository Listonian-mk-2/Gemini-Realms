
import React, { useState } from 'react';
import { GameState } from '../game/types';
import { CharacterSheet } from './CharacterSheet';
import { Inventory } from './Inventory';
import { Settings } from './Settings';

interface RightPanelProps {
  gameState: GameState;
  dispatch: React.Dispatch<any>;
}

type ActiveTab = 'character' | 'inventory' | 'map' | 'settings';

export const RightPanel: React.FC<RightPanelProps> = ({ gameState, dispatch }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('character');
  const { player, narrationEnabled, elevenLabsApiKey, narrationVoiceId, systemVoiceId, customVoices, impEnabled, impVoiceId, ambientSoundEnabled, ambientSoundVolume, pixabayApiKey, saveIndex } = gameState;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'character':
        return <CharacterSheet player={player} />;
      case 'inventory':
        return <Inventory player={player} dispatch={dispatch} />;
      case 'map':
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="text-6xl">🗺️</div>
                <h3 className="text-xl font-bold text-gray-300">World Map</h3>
                <p className="text-sm text-gray-500">View your journey and the lands you have discovered.</p>
                <button 
                    onClick={() => dispatch({ type: 'TOGGLE_MAP', payload: true })}
                    className="bg-red-900/80 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-lg border border-red-700 shadow-lg transition-all transform hover:scale-105"
                >
                    Open Full Map
                </button>
            </div>
        );
      case 'settings':
        return <Settings
                    narrationEnabled={narrationEnabled}
                    apiKey={elevenLabsApiKey}
                    narrationVoiceId={narrationVoiceId}
                    systemVoiceId={systemVoiceId}
                    customVoices={customVoices}
                    impEnabled={impEnabled}
                    impVoiceId={impVoiceId}
                    ambientSoundEnabled={ambientSoundEnabled}
                    ambientSoundVolume={ambientSoundVolume}
                    pixabayApiKey={pixabayApiKey}
                    saveIndex={saveIndex}
                    dispatch={dispatch}
                />;
      default:
        return null;
    }
  };

  const getTabClass = (tabName: ActiveTab) => 
    `w-1/4 py-2 text-center cursor-pointer transition-colors duration-200 border-b-2 text-sm sm:text-base ${
      activeTab === tabName 
        ? 'bg-gray-700 border-red-500' 
        : 'bg-gray-800 border-transparent hover:bg-gray-700'
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex">
        <div className={getTabClass('character')} onClick={() => setActiveTab('character')}>Character</div>
        <div className={getTabClass('inventory')} onClick={() => setActiveTab('inventory')}>Inventory</div>
        <div className={getTabClass('map')} onClick={() => setActiveTab('map')}>Map</div>
        <div className={getTabClass('settings')} onClick={() => setActiveTab('settings')}>Settings</div>
      </div>
      <div className="flex-grow bg-gray-800 rounded-b-lg overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};
