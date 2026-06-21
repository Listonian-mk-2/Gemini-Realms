
import React from 'react';

interface GameOverScreenProps {
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-center p-4">
      <h1 className="text-8xl font-bold text-red-700 mb-4">You Have Died</h1>
      <p className="text-2xl text-gray-400 mb-8">Your adventure has come to a premature end.</p>
      <button
        onClick={onRestart}
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-10 rounded-lg text-xl transition-colors"
      >
        Try Again
      </button>
    </div>
  );
};
