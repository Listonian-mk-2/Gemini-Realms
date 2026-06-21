
import React from 'react';
import { Player } from '../game/types';

interface CharacterSheetProps {
  player: Player;
}

const StatBar: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span>{value} / {max}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ player }) => {
  return (
    <div className="p-4 space-y-4 text-gray-300">
      <h2 className="text-2xl font-bold text-center border-b border-gray-600 pb-2 text-red-400">{player.name}</h2>
      <p className="text-center text-lg">{`Level ${player.level} ${player.class}`}</p>
      
      <StatBar value={player.hp} max={player.maxHp} label="Health" color="bg-red-600" />
      <StatBar value={player.xp} max={player.xpToNextLevel} label="Experience" color="bg-yellow-500" />
      
      <div className="grid grid-cols-2 gap-4 pt-2 text-center">
        <div>
            <p className="text-gray-400">Attack</p>
            <p className="text-xl">{player.attack + (player.equipped.weapon?.value || 0)}</p>
        </div>
        <div>
            <p className="text-gray-400">Defense</p>
            <p className="text-xl">{player.defense + (player.equipped.armor?.armor || 0)}</p>
        </div>
      </div>
      
      <div className="pt-2">
        <h3 className="text-xl font-semibold mb-2 text-center">Equipped</h3>
        <div className="space-y-2">
            <p><span className="font-bold text-gray-400">Weapon:</span> {player.equipped.weapon?.name || 'None'}</p>
            <p><span className="font-bold text-gray-400">Armor:</span> {player.equipped.armor?.name || 'None'}</p>
        </div>
      </div>
    </div>
  );
};
