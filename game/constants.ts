
import { PlayerClass, Item, ItemType } from './types';

export const EXPLORATION_XP = 20;

export const HEALING_POTION: Item = {
    id: 'potion_health_1',
    name: 'Healing Potion',
    description: 'A simple potion that restores 25 HP.',
    type: ItemType.Potion,
    value: 25,
};

export const CLASS_CONFIG: Record<PlayerClass, { baseHp: number; baseAttack: number; baseDefense: number; startingWeapon: Item; startingArmor: Item; }> = {
  [PlayerClass.Warrior]: {
    baseHp: 120,
    baseAttack: 15,
    baseDefense: 10,
    startingWeapon: { id: 'w_sword_1', name: 'Iron Sword', description: 'A sturdy iron longsword.', type: ItemType.Weapon, value: 8 },
    startingArmor: { id: 'a_chainmail_1', name: 'Chainmail', description: 'Standard issue chainmail armor.', type: ItemType.Armor, armor: 5 },
  },
  [PlayerClass.Mage]: {
    baseHp: 80,
    baseAttack: 8,
    baseDefense: 5,
    startingWeapon: { id: 'w_staff_1', name: 'Apprentice Staff', description: 'A gnarled wooden staff.', type: ItemType.Weapon, value: 10 },
    startingArmor: { id: 'a_robes_1', name: 'Mage Robes', description: 'Simple cloth robes.', type: ItemType.Armor, armor: 2 },
  },
  [PlayerClass.Rogue]: {
    baseHp: 100,
    baseAttack: 12,
    baseDefense: 8,
    startingWeapon: { id: 'w_dagger_1', name: 'Steel Dagger', description: 'A sharp steel dagger.', type: ItemType.Weapon, value: 6 },
    startingArmor: { id: 'a_leather_1', name: 'Leather Armor', description: 'Toughened leather armor.', type: ItemType.Armor, armor: 3 },
  },
};

export interface LootTier {
    name: string;
    materials: string;
    weaponDmg: string; // Range e.g. "2-6"
    armorDef: string; // Range e.g. "1-3"
    dropChance: number; // 0-1
}

export const getLootTier = (level: number): LootTier => {
    if (level <= 3) {
        return {
            name: "Basic",
            materials: "Rusty Iron, Old Wood, Tattered Leather, Copper",
            weaponDmg: "3-8",
            armorDef: "1-4",
            dropChance: 0.3
        };
    } else if (level <= 6) {
        return {
            name: "Standard",
            materials: "Iron, Polished Wood, Cured Leather, Bronze",
            weaponDmg: "8-14",
            armorDef: "4-8",
            dropChance: 0.4
        };
    } else if (level <= 9) {
        return {
            name: "High Quality",
            materials: "Steel, Oak, Studded Leather, Silver Inlay",
            weaponDmg: "14-22",
            armorDef: "8-12",
            dropChance: 0.5
        };
    } else {
        return {
            name: "Legendary",
            materials: "Mithril, Dragonscale, Enchanted Ebony, Gold",
            weaponDmg: "22-35",
            armorDef: "12-20",
            dropChance: 0.6
        };
    }
};