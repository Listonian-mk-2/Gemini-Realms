import React from 'react';
import { Player, ItemType, Item } from '../game/types';

interface InventoryProps {
  player: Player;
  dispatch: React.Dispatch<any>;
}

const getItemTypeIcon = (type: ItemType) => {
    switch(type) {
        case ItemType.Weapon: return '🗡️';
        case ItemType.Armor: return '🛡️';
        case ItemType.Potion: return '🧪';
        case ItemType.Key: return '🔑';
        default: return '📜';
    }
}

export const Inventory: React.FC<InventoryProps> = ({ player, dispatch }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center border-b border-gray-600 pb-2 mb-4 text-red-400">Inventory</h2>
      {player.inventory.length === 0 ? (
        <p className="text-gray-400 text-center">Your inventory is empty.</p>
      ) : (
        <ul className="space-y-3">
          {player.inventory.map((item, index) => {
            const isEquipped = player.equipped.weapon?.id === item.id || player.equipped.armor?.id === item.id;
            const isEquippable = item.type === ItemType.Weapon || item.type === ItemType.Armor;

            const handleEquip = () => {
                dispatch({ type: 'EQUIP_ITEM', payload: item });
            };

            const handleUnequip = () => {
                dispatch({ type: 'UNEQUIP_ITEM', payload: item });
            };

            return (
              <li key={`${item.id}-${index}`} className="bg-gray-700 p-3 rounded-md space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-lg text-gray-200">
                            <span className="mr-2">{getItemTypeIcon(item.type)}</span>
                            {item.name} {isEquipped && <span className="text-green-400 text-sm">(Equipped)</span>}
                        </p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    {isEquippable && (
                        isEquipped ? (
                            <button onClick={handleUnequip} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1 px-2 rounded-md transition-colors flex-shrink-0 ml-2">Unequip</button>
                        ) : (
                            <button onClick={handleEquip} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded-md transition-colors flex-shrink-0 ml-2">Equip</button>
                        )
                    )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  );
};