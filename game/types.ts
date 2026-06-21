
export enum PlayerClass {
  Warrior = 'Warrior',
  Mage = 'Mage',
  Rogue = 'Rogue',
}

export enum ItemType {
  Weapon = 'Weapon',
  Armor = 'Armor',
  Potion = 'Potion',
  Key = 'Key',
  Quest = 'Quest',
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  value?: number; // for potions (e.g., healing amount) or weapons (damage)
  armor?: number; // for armor
}

export interface Monster {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  loot: Item[];
}

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface Room {
  id:string;
  name: string;
  description: string;
  exits: Partial<Record<Direction, string>>;
  items: Item[];
  monster?: Monster;
  details?: Record<string, string>; // e.g., { "bookshelf": "It's full of dusty old books." }
}

export interface World {
  rooms: Record<string, Room>;
}

export interface Player {
  name: string;
  class: PlayerClass;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  inventory: Item[];
  location: string; // Room ID
  equipped: {
    weapon: Item | null;
    armor: Item | null;
  };
}

export enum GameStatus {
    StartScreen = 'start_screen',
    Playing = 'playing',
    GameOver = 'game_over',
}

export interface GameMessage {
    text: string;
    type: 'normal' | 'player_action' | 'combat_player' | 'combat_enemy' | 'loot' | 'system' | 'error' | 'hint' | 'imp';
}

export interface CustomVoice {
    id: string;
    name: string;
}

export interface SaveSlotMeta {
    id: string;
    name: string;
    timestamp: number;
    playerClass: PlayerClass;
    playerLevel: number;
    locationName: string;
    isAutoSave: boolean;
}

export interface GameState {
  player: Player;
  world: World;
  log: GameMessage[];
  gameStatus: GameStatus;
  saveIndex: SaveSlotMeta[];
  currentImage: string | null;
  isLoadingImage: boolean;
  lastLocation: string | null;
  isProcessingCommand: boolean;
  actionsSinceProgress: number;
  visitedRooms: string[];
  isMapOpen: boolean;
  // Narration
  narrationEnabled: boolean;
  elevenLabsApiKey: string | null;
  narrationVoiceId: string;
  systemVoiceId: string;
  customVoices: CustomVoice[];
  // Imp Companion
  impEnabled: boolean;
  impVoiceId: string;
  // Ambient Sound
  ambientSoundEnabled: boolean;
  ambientSoundVolume: number;
  pixabayApiKey: string | null;
  currentAmbientSoundUrl: string | null;
}
