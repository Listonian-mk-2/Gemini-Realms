
import React, { useState } from 'react';

interface CommandInputProps {
  onCommand: (command: string) => void;
  isProcessing: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onCommand, isProcessing }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isProcessing) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  return (
    <div className="p-2 border-t-4 border-gray-700 flex-shrink-0 bg-black">
      <form onSubmit={handleSubmit} className="flex">
        <span className="text-xl text-red-500 mr-2">{'>'}</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-xl text-gray-200 disabled:opacity-50"
          placeholder={isProcessing ? "Thinking..." : "Enter command..."}
          autoFocus
          disabled={isProcessing}
        />
      </form>
    </div>
  );
};
