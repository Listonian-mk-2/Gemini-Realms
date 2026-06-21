import { World, Item, ItemType, Monster } from './types';

// --- Items ---
const goblinSword: Item = { id: 'w_sword_goblin', name: 'Rusty Goblin Sword', description: 'A crude and rusty sword.', type: ItemType.Weapon, value: 4 };
const ancientKey: Item = { id: 'key_ancient', name: 'Ancient Key', description: 'A heavy iron key, covered in moss.', type: ItemType.Key };
const torch: Item = { id: 'item_torch_1', name: 'Flickering Torch', description: 'A simple wooden torch, sputtering and casting dancing shadows. It provides a modest amount of light.', type: ItemType.Quest };


// --- Monsters ---
const createGoblin = (): Monster => ({
  id: 'm_goblin_1',
  name: 'Goblin Scout',
  hp: 30,
  maxHp: 30,
  attack: 8,
  defense: 2,
  xp: 15,
  loot: [goblinSword],
});

const createGiantSpider = (): Monster => ({
  id: 'm_spider_1',
  name: 'Giant Spider',
  hp: 50,
  maxHp: 50,
  attack: 12,
  defense: 5,
  xp: 30,
  loot: [],
});


// --- World Definition ---
export const world: World = {
  rooms: {
    // Starting areas
    barracks: {
      id: 'barracks',
      name: 'Dusty Barracks',
      description: 'The wooden floorboards creak under your weight. Rows of empty bunks line the walls, covered in a thick layer of dust. A single torch flickers in a sconce on the wall, casting long shadows.',
      exits: { south: 'town_square' },
      items: [torch],
      details: {
        'bunks': 'The bunks are simple wooden frames with thin, straw-filled mattresses. Everything is coated in a thick blanket of dust.',
      }
    },
    library: {
      id: 'library',
      name: 'Forgotten Library',
      description: 'Shelves overflowing with ancient tomes reach towards the high, vaulted ceiling. The air smells of old paper and dust. Most books have crumbled to dust.',
      exits: { south: 'town_square' },
      items: [],
      details: {
        'bookshelves': 'The shelves are crammed with ancient, leather-bound books, their spines faded and cracked. Most are too decayed to read, but they speak of a forgotten history.',
        'tomes': 'The tomes are mostly ruined, their pages turned to dust. You can make out faded titles about arcane arts and local history.',
        'ceiling': 'The vaulted ceiling is lost in shadow, covered in intricate cobwebs that look centuries old.'
      }
    },
    tavern: {
      id: 'tavern',
      name: 'The Sleeping Dragon Tavern',
      description: 'The smell of stale ale hangs in the air. Overturned chairs and tables are scattered across the room. A large, unlit fireplace dominates one wall.',
      exits: { south: 'town_square' },
      items: [],
      details: {
        'fireplace': 'A grand, stone fireplace, cold and dark. The hearth is filled with ash and soot from countless fires long extinguished.',
        'chairs': 'The wooden chairs are sturdy but scarred from years of use and abuse. Many are overturned and broken.',
        'tables': 'Heavy oak tables, slick with a layer of grime. One has a half-finished game of checkers carved into its surface.'
      }
    },
    // Main town
    town_square: {
      id: 'town_square',
      name: 'Abandoned Town Square',
      description: 'You stand in the center of what was once a bustling town square. A crumbling fountain sits in the middle, choked with weeds. Buildings with boarded-up windows surround you.',
      exits: { north: 'barracks', west: 'forest_path', east: 'ruined_temple' },
      items: [],
      details: {
        'fountain': 'The stone fountain is cracked and dry. A statue of a forgotten king, now headless, stands at its center. Weeds grow from every crevice.',
        'buildings': 'The surrounding buildings are in a state of disrepair, their windows boarded up and doors barred. It seems no one has lived here for a very long time.'
      }
    },
    // Wilderness
    forest_path: {
      id: 'forest_path',
      name: 'Overgrown Forest Path',
      description: 'A narrow path winds through ancient, gnarled trees. The canopy above is so thick that little light reaches the forest floor. Strange sounds echo in the distance.',
      exits: { east: 'town_square', west: 'spider_lair' },
      items: [],
      monster: createGoblin(),
    },
    spider_lair: {
        id: 'spider_lair',
        name: 'Spider-infested Lair',
        description: 'Thick, sticky webs cover every surface of this dark cave. The ground is littered with the desiccated husks of unfortunate creatures. A large, shadowy form moves in the corner.',
        exits: { east: 'forest_path' },
        items: [ancientKey],
        monster: createGiantSpider(),
    },
    // Dungeon
    ruined_temple: {
        id: 'ruined_temple',
        name: 'Ruined Temple Entrance',
        description: 'Before you stands the grand entrance to a ruined temple. The stone doors are ajar, revealing a dark passage leading downwards. The air is cold and smells of damp earth.',
        exits: { west: 'town_square' },
        items: [],
    }
  },
};