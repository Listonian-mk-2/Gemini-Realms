
import { GameState, GameStatus, Item } from './types';
import { processPlayerTurn, getHint } from '../services/aiService';
import { EXPLORATION_XP } from './constants';

const HINT_THRESHOLD = 5; // Number of non-progress actions before a hint

// A utility to add messages to the log, ensuring it doesn't grow indefinitely
function addLog(state: GameState, text: string, type: GameState['log'][0]['type'] = 'normal'): GameState {
  const newLog = [...state.log, { text, type }];
  if (newLog.length > 100) {
    newLog.shift();
  }
  return { ...state, log: newLog };
}

// Check if the player has leveled up and apply the benefits
function checkAndApplyLevelUp(state: GameState): GameState {
    let newState = { ...state };
    let leveledUp = false;
    while(newState.player.xp >= newState.player.xpToNextLevel) {
        leveledUp = true;
        newState.player.level++;
        newState.player.xp -= newState.player.xpToNextLevel;
        newState.player.xpToNextLevel = Math.floor(newState.player.xpToNextLevel * 1.5);
        
        const hpGain = Math.floor(newState.player.maxHp * 0.2);
        const attackGain = 2;
        const defenseGain = 1;

        newState.player.maxHp += hpGain;
        newState.player.hp = newState.player.maxHp; // Full heal on level up
        newState.player.attack += attackGain;
        newState.player.defense += defenseGain;

        newState = addLog(newState, `LEVEL UP! You are now level ${newState.player.level}.`, 'system');
        newState = addLog(newState, `Max HP increased by ${hpGain}. Attack by ${attackGain}. Defense by ${defenseGain}. You are fully healed.`, 'system');
    }
    return newState;
}


// This is the new core of the game engine.
export async function processCommand(command: string, state: GameState): Promise<GameState> {
    // Basic commands that don't need the AI
    if (command.toLowerCase() === 'save') {
        localStorage.setItem('geminiRealmsSave', JSON.stringify(state));
        return addLog(state, "Game saved.", 'system');
    }
    if (command.toLowerCase() === 'load') {
        return addLog(state, "To load a game, please restart and use the main menu.", 'system');
    }

    // Increment the counter for aimless actions
    let newState = { ...state, actionsSinceProgress: (state.actionsSinceProgress || 0) + 1 };
    
    // Send the state and command to the AI Game Master
    const update = await processPlayerTurn(command, newState);
    
    let progressMade = false;

    // 1. Add the AI's narration and dialogue to the log
    if (update.narration) {
        newState = addLog(newState, update.narration, 'normal');
    }
    if (update.impDialogue) {
        newState = addLog(newState, update.impDialogue, 'imp');
    }
    
    // 2. Apply updates to the player object
    if (update.player) {
        newState.player = { ...newState.player, ...update.player };
        
        // Check for location change and update visited rooms for the map
        if (update.player.location && update.player.location !== state.player.location) {
            // Validate that the new location exists
            if (!newState.world.rooms[update.player.location]) {
                console.warn(`AI suggested non-existent room: ${update.player.location}. Reverting location.`);
                newState.player.location = state.player.location;
            } else {
                progressMade = true;
                if (!newState.visitedRooms.includes(update.player.location)) {
                    newState.visitedRooms = [...newState.visitedRooms, update.player.location];
                    
                    // Award Exploration XP
                    newState.player.xp += EXPLORATION_XP;
                    newState = addLog(newState, `Exploration Bonus: +${EXPLORATION_XP} XP`, 'system');
                }
            }
        }
    }
    
    // 3. Handle inventory changes
    if (update.inventory) {
        // Add items
        if (update.inventory.add && update.inventory.add.length > 0) {
            progressMade = true; // Picking up an item is progress
            update.inventory.add.forEach(item => {
                newState.player.inventory.push(item);
                newState = addLog(newState, `You obtained ${item.name}.`, 'loot');
            });
        }
        // Remove items
        if (update.inventory.remove) {
            update.inventory.remove.forEach(itemName => {
                const itemIndex = newState.player.inventory.findIndex(i => i.name === itemName);
                if (itemIndex > -1) {
                    // Using an item (e.g. potion, key) is progress
                    progressMade = true;
                    // Check if the removed item was equipped
                    const removedItem = newState.player.inventory[itemIndex];
                    if (newState.player.equipped.weapon?.id === removedItem.id) {
                         newState.player.equipped.weapon = null;
                    }
                    if (newState.player.equipped.armor?.id === removedItem.id) {
                        newState.player.equipped.armor = null;
                    }
                    newState.player.inventory.splice(itemIndex, 1);
                }
            });
        }
    }

    // 4. Update the current room's state in the world
    const currentRoomId = newState.player.location;
    const currentRoom = newState.world.rooms[currentRoomId];
    
    if (update.room && currentRoom) {
         // Check if a monster was defeated
        const oldMonsterHp = currentRoom.monster?.hp;
        if (oldMonsterHp && oldMonsterHp > 0 && (!update.room.monster || update.room.monster.hp <= 0)) {
            progressMade = true;
        }

        // Merge room properties. Special handling for exits to allow unlocking.
        const newExits = update.room.exits 
            ? { ...currentRoom.exits, ...update.room.exits } 
            : currentRoom.exits;

        newState.world.rooms[currentRoomId] = { 
            ...currentRoom, 
            ...update.room,
            exits: newExits
        };
    }

    // 5. Handle special game status changes from the AI
    if (update.gameOver) {
        newState.gameStatus = GameStatus.GameOver;
        newState = addLog(newState, "Your journey has ended.", 'system');
        return newState;
    }

    // Reset counter if progress was made
    if(progressMade) {
        newState.actionsSinceProgress = 0;
    }

    // 6. After all updates, check for level up
    const stateBeforeLevelUp = { ...newState };
    newState = checkAndApplyLevelUp(newState);
    if (newState.player.level > stateBeforeLevelUp.player.level) {
        progressMade = true; // Leveling up is definitely progress
        newState.actionsSinceProgress = 0;
    }
    
    // 7. Check for hint threshold
    if (newState.actionsSinceProgress >= HINT_THRESHOLD) {
        const hint = await getHint(newState);
        newState = addLog(newState, hint, 'hint');
        newState.actionsSinceProgress = 0; // Reset after giving a hint
    }
    
    // 8. Check for player death after all updates
    if (newState.player.hp <= 0) {
        newState.player.hp = 0;
        newState.gameStatus = GameStatus.GameOver;
        newState = addLog(newState, "You have been defeated...", 'system');
    }
    
    return newState;
}
