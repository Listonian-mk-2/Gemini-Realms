
import React from 'react';
import { GameState } from '../game/types';
import { ImageViewer } from './ImageViewer';
import { MessageLog } from './MessageLog';
import { CommandInput } from './CommandInput';
import { RightPanel } from './RightPanel';
import { Map } from './Map';

interface GameScreenProps {
  gameState: GameState;
  onCommand: (command: string) => void;
  dispatch: React.Dispatch<any>; // Allow dispatching actions from child components
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameState, onCommand, dispatch }) => {
  return (
    <div className="flex flex-col h-screen bg-black relative">
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-grow flex flex-col w-full md:w-3/4">
          <ImageViewer imageUrl={gameState.currentImage} isLoading={gameState.isLoadingImage} />
          <MessageLog log={gameState.log} />
          <CommandInput onCommand={onCommand} isProcessing={gameState.isProcessingCommand} />
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/4 bg-gray-900 border-l border-gray-700 overflow-y-auto p-2">
            <RightPanel gameState={gameState} dispatch={dispatch} />
        </div>
      </div>

      {/* Map Overlay */}
      {gameState.isMapOpen && (
          <Map 
            world={gameState.world} 
            visitedRooms={gameState.visitedRooms} 
            playerLocation={gameState.player.location}
            onClose={() => dispatch({ type: 'TOGGLE_MAP', payload: false })}
          />
      )}
    </div>
  );
};
