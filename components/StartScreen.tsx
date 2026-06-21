import React, { useState } from 'react';
import { PlayerClass } from '../game/types';

interface StartScreenProps {
  onNewGame: (playerClass: PlayerClass) => void;
  onLoadGame: () => void;
  hasSaveGame: boolean;
  isGeneratingWorld: boolean;
}

const classDescriptions = {
    [PlayerClass.Warrior]: "A master of arms, strong and resilient. Excels in direct combat with high health and defense.",
    [PlayerClass.Mage]: "A wielder of arcane energies. Fragile but capable of immense power from a distance.",
    [PlayerClass.Rogue]: "A shadowy figure who strikes from the unseen. Relies on speed and precision to overcome foes."
};

export const StartScreen: React.FC<StartScreenProps> = ({ onNewGame, onLoadGame, hasSaveGame, isGeneratingWorld }) => {
    const [selectedClass, setSelectedClass] = useState<PlayerClass>(PlayerClass.Warrior);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4 text-center">
            <h1 className="text-6xl font-bold mb-4 text-red-500 tracking-wider" style={{fontFamily: "'IM Fell English', serif"}}>Gemini Realms</h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl">An AI-enhanced text adventure. Your choices shape the world, and your descriptions bring it to life.</p>
            
            {isGeneratingWorld ? (
                 <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl text-center">
                    <h2 className="text-3xl font-semibold mb-4 text-gray-200">Generating Your Realm...</h2>
                    <p className="text-gray-400">The cosmic energies are aligning to forge your adventure. Please wait a moment.</p>
                    <div className="flex justify-center items-center mt-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl">
                    <h2 className="text-3xl font-semibold mb-6 text-gray-200">Choose Your Class</h2>
                    <div className="flex justify-center space-x-4 mb-6">
                        {(Object.values(PlayerClass) as PlayerClass[]).map(pc => (
                            <button
                                key={pc}
                                onClick={() => setSelectedClass(pc)}
                                className={`px-6 py-2 text-lg border-2 rounded-md transition-all duration-200 ${selectedClass === pc ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-700 border-gray-600 hover:bg-red-700 hover:border-red-600'}`}
                                disabled={isGeneratingWorld}
                            >
                                {pc}
                            </button>
                        ))}
                    </div>
                    <p className="text-gray-400 mb-8 h-16">{classDescriptions[selectedClass]}</p>

                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <button
                            onClick={() => onNewGame(selectedClass)}
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isGeneratingWorld}
                        >
                            New Game
                        </button>
                        {hasSaveGame && (
                            <button
                                onClick={onLoadGame}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isGeneratingWorld}
                            >
                                Load Game
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};