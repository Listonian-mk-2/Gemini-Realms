import React, { useEffect, useRef } from 'react';
import { GameMessage } from '../game/types';

interface MessageLogProps {
  log: GameMessage[];
}

const getTextColor = (type: GameMessage['type']) => {
    switch (type) {
        case 'player_action': return 'text-gray-400 italic';
        case 'combat_player': return 'text-yellow-400';
        case 'combat_enemy': return 'text-red-500';
        case 'loot': return 'text-green-400';
        case 'system': return 'text-blue-400';
        case 'error': return 'text-orange-400';
        case 'hint': return 'text-purple-400 italic';
        case 'imp': return 'text-orange-400 font-imp text-2xl tracking-wide'; // Updated Imp styling
        default: return 'text-gray-200';
    }
}

export const MessageLog: React.FC<MessageLogProps> = ({ log }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="flex-grow p-4 overflow-y-auto bg-black text-lg leading-relaxed">
      {log.map((msg, index) => (
        <p key={index} className={`${getTextColor(msg.type)} whitespace-pre-wrap`}>
          {msg.text}
        </p>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};