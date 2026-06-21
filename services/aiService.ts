
import { GoogleGenAI, Modality, Type, Chat } from "@google/genai";
import { World, GameState, Player, Item, Monster, PlayerClass, Room } from '../game/types';
import { getLootTier } from '../game/constants';

let ai: GoogleGenAI;
let chat: Chat;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// --- WORLD GENERATION ---

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Weapon', 'Armor', 'Potion', 'Key', 'Quest'] },
        value: { type: Type.NUMBER, nullable: true },
        armor: { type: Type.NUMBER, nullable: true },
    },
    required: ['id', 'name', 'description', 'type']
};

const monsterSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        hp: { type: Type.NUMBER },
        maxHp: { type: Type.NUMBER },
        attack: { type: Type.NUMBER },
        defense: { type: Type.NUMBER },
        xp: { type: Type.NUMBER },
        loot: { type: Type.ARRAY, items: itemSchema }
    },
    required: ['id', 'name', 'hp', 'maxHp', 'attack', 'defense', 'xp', 'loot']
};

const detailSchema = {
    type: Type.OBJECT,
    properties: {
        key: { type: Type.STRING, description: "The keyword for the detail (e.g., 'altar', 'painting')." },
        value: { type: Type.STRING, description: "The description of the detail when examined." }
    },
    required: ['key', 'value']
};

const roomSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        exits: {
            type: Type.OBJECT,
            properties: {
                north: { type: Type.STRING, nullable: true },
                south: { type: Type.STRING, nullable: true },
                east: { type: Type.STRING, nullable: true },
                west: { type: Type.STRING, nullable: true },
            }
        },
        items: { type: Type.ARRAY, items: itemSchema },
        monster: {
            type: Type.OBJECT,
            properties: monsterSchema.properties,
            required: monsterSchema.required,
            nullable: true
        },
        details: { 
            type: Type.ARRAY, 
            items: detailSchema,
            description: "An array of examinable scenery details in the room."
        },
    },
    required: ['id', 'name', 'description', 'exits', 'items']
};


const worldSchema = {
    type: Type.OBJECT,
    properties: {
        rooms: {
            type: Type.ARRAY,
            description: "An array of all the room objects that make up the game world.",
            items: roomSchema
        },
        startingLocation: {
            type: Type.STRING,
            description: "The ID of the room where the player begins their adventure. Must match one of the room IDs."
        },
        startingNarration: {
            type: Type.STRING,
            description: "A compelling, descriptive introductory text for the player, setting the scene of the starting location."
        }
    },
    required: ["rooms", "startingLocation", "startingNarration"]
};

export async function initializeGame(playerClass: PlayerClass): Promise<{ world: World, startingLocation: string, startingNarration: string }> {
    const aiInstance = getAI();
    
    const systemInstruction = `You are a creative and detailed Game Master for a classic text-based fantasy RPG. Your primary role is to generate a rich, interactive world and then manage the player's journey through it.`;
    
    const prompt = `Generate a small, unique, and compelling starting area for a new text adventure game. The player is a ${playerClass}.
    
    The area should consist of 3-5 interconnected rooms with a clear theme (e.g., 'a forgotten crypt', 'a bandit hideout in a cave', 'a crumbling wizard's tower').

    **CRITICAL: Environmental Puzzles & Obstacles**
    - You MUST include at least one environmental puzzle or obstacle.
    - Examples: A locked door requiring a key, a dark chasm needing a torch to cross, or a pile of rubble that needs clearing.
    - **IMPORTANT:** If a room has a locked or blocked exit, **DO NOT** include that direction in the 'exits' object initially. 
      - Instead, describe the blocked exit in the 'description' (e.g., "To the north, a heavy iron door stands locked.").
      - Place the required key or tool (Item Type: 'Key' or 'Quest') in a different room or inside a container.

    For the world structure, you MUST provide:
    1.  A 'rooms' property which is an ARRAY of room objects.
    2.  Each room object in the array MUST contain:
        -   'id': A unique string ID (e.g., 'crypt_entrance', 'hall_of_heroes').
        -   'name': A short, evocative title (e.g., "Sunken Tomb Entrance").
        -   'description': A detailed, multi-sentence paragraph describing the room's atmosphere. Keep it under 100 words.
        -   'exits': An object where keys are directions ('north', 'south', 'east', 'west') and values are the string IDs of the connected rooms.
        -   'items': An array of item objects. Items should have 'id', 'name', 'description', and 'type' ('Weapon', 'Armor', 'Potion', 'Key', 'Quest'). Weapons should have a 'value' for damage, armor an 'armor' value.
        -   'monster' (optional): A single monster object if the room is dangerous. Monsters need 'id', 'name', 'hp', 'maxHp', 'attack', 'defense', 'xp', and a 'loot' array.
        -   'details': An array of objects for examinable scenery, where each object has a 'key' (e.g., "altar") and a 'value' (description).
    3.  A 'startingLocation' string, which must be the ID of one of the rooms you created.
    4.  A 'startingNarration' string, which is a compelling description of the player's arrival in the starting location.

    Your response must be ONLY the JSON object conforming to the schema. Do not include any other text or formatting.`;

    // For world generation, we use a more powerful model for reliability
    const response = await aiInstance.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: worldSchema,
            maxOutputTokens: 4096,
        },
    });

    const jsonText = response.text.trim();
    const parsed = cleanAndParseJson(jsonText);
    
    const worldRooms: Record<string, Room> = (parsed.rooms as any[]).reduce((acc, roomData) => {
        const room: Room = {
            ...roomData,
            details: {}
        };
        
        // Convert details array to record
        if (roomData.details && Array.isArray(roomData.details)) {
            const detailsRecord: Record<string, string> = {};
            roomData.details.forEach((d: any) => {
                if (d.key && d.value) {
                    detailsRecord[d.key] = d.value;
                }
            });
            room.details = detailsRecord;
        }
        
        acc[room.id] = room;
        return acc;
    }, {} as Record<string, Room>);
    
    const world: World = { rooms: worldRooms };
    
    // Initialize the chat session for the gameplay that follows
    chat = aiInstance.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
            systemInstruction: `You are the Game Master for a text-based RPG. You have two personas:
1.  **The Narrator**: An objective, descriptive, and engaging storyteller, writing in the second person (e.g., "You see...", "You open the chest...").
2.  **The Imp**: A sarcastic, wisecracking, cowardly voice in the player's head, inspired by Iago from Aladdin (a Gilbert Gottfried persona). It makes short, witty, and often unhelpful comments.

Your response MUST strictly adhere to the provided JSON schema. Do not add extra commentary.`
        }
    });

    return { world, startingLocation: parsed.startingLocation, startingNarration: parsed.startingNarration };
}

/**
 * Robustly cleans and parses JSON from the AI response.
 */
function cleanAndParseJson(text: string): any {
    let cleaned = text.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Initial JSON parse failed, attempting repair...", e);
        // Basic repair: try to close unclosed strings and structures
        let repaired = cleaned;
        
        // If it ends with a partial string, close it
        if ((repaired.match(/"/g) || []).length % 2 !== 0) {
            repaired += '"';
        }
        
        // Close braces and brackets
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
        
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
        
        try {
            return JSON.parse(repaired);
        } catch (e2) {
            console.error("Repair failed:", e2);
            throw e; // Throw original error if repair fails
        }
    }
}


// --- GAMEPLAY PROCESSING ---

// This interface defines the structure the AI's response must follow
export interface GameStateUpdate {
    narration: string;
    impDialogue?: string;
    player?: Partial<Player>;
    inventory?: {
        add?: Item[];
        remove?: string[]; // names of items to remove
    };
    room?: Partial<{
        description: string;
        items: Item[];
        monster: Monster | null; // Use null to signify monster is removed
        exits?: Partial<Record<string, string>>; // Allow updating exits (e.g. unlocking doors)
    }>;
    gameOver?: boolean;
}

const turnSchema = {
    type: Type.OBJECT,
    properties: {
        narration: { type: Type.STRING, description: "A detailed, narrative description of the outcome of the player's action. This is what the player will read." },
        impDialogue: { type: Type.STRING, description: "(Optional) A short, sarcastic comment from the Imp companion in the player's head. Keep it under 15 words." },
        player: { 
            type: Type.OBJECT, 
            description: "An object containing any direct changes to the player's stats. Only include fields that change.",
            properties: {
                hp: { type: Type.NUMBER },
                xp: { type: Type.NUMBER },
                location: { type: Type.STRING },
                equipped: {
                    type: Type.OBJECT,
                    description: "Updates to the player's equipped items. Only include slots that are changing. Provide the full item object for equipping, or null for unequipping.",
                    properties: {
                        weapon: { ...itemSchema, nullable: true },
                        armor: { ...itemSchema, nullable: true },
                    }
                }
            }
        },
        inventory: {
            type: Type.OBJECT,
            description: "Changes to the player's inventory.",
            properties: {
                add: { type: Type.ARRAY, items: itemSchema, description: "An array of full item objects to add to inventory." },
                remove: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of item NAMES to remove from inventory." }
            }
        },
        room: {
            type: Type.OBJECT,
            description: "Changes to the current room's state. Only include fields that change.",
            properties: {
                description: { type: Type.STRING },
                items: { type: Type.ARRAY, items: itemSchema },
                monster: { ...monsterSchema, nullable: true },
                exits: {
                    type: Type.OBJECT,
                    description: "Updates to the room's exits. Use this to unlock doors or reveal paths. The keys are directions (north, south, east, west) and values are room IDs.",
                    properties: {
                        north: { type: Type.STRING, nullable: true },
                        south: { type: Type.STRING, nullable: true },
                        east: { type: Type.STRING, nullable: true },
                        west: { type: Type.STRING, nullable: true },
                    }
                }
            }
        },
        gameOver: { type: Type.BOOLEAN, description: "Set to true if the player's action results in game over." }
    },
    required: ["narration"]
};

export async function processPlayerTurn(command: string, state: GameState): Promise<GameStateUpdate> {
    try {
        const aiInstance = getAI();
        
        if (!chat) {
            chat = aiInstance.chats.create({
                model: 'gemini-3.1-pro-preview',
                config: {
                    systemInstruction: `You are the Game Master for a text-based RPG. You have two personas:
1.  **The Narrator**: An objective, descriptive, and engaging storyteller, writing in the second person (e.g., "You see...", "You open the chest...").
2.  **The Imp**: A sarcastic, wisecracking, cowardly voice in the player's head, inspired by Iago from Aladdin (a Gilbert Gottfried persona). It makes short, witty, and often unhelpful comments.

Your response MUST strictly adhere to the provided JSON schema. Do not add extra commentary.`
                }
            });
        }

        const simplifiedState = {
            player: state.player,
            room: state.world.rooms[state.player.location]
        };

        const lootTier = getLootTier(state.player.level);

        const prompt = `Here is the current game state:
        ${JSON.stringify(simplifiedState)}

        The player's command is: "${command}"

        Process this command and return the JSON object describing the outcome and state changes.

        **CRITICAL RULES:**
        -   Your narration MUST accurately reflect the game state. Pay close attention to the player's equipped items in \`player.equipped\`. If a weapon is equipped, the player is holding it.
        -   When calculating combat effectiveness, the player's total attack is \`player.attack\` + the \`value\` of the equipped weapon. Total defense is \`player.defense\` + the \`armor\` of the equipped armor.

        **PUZZLE & INTERACTION RULES:**
        -   If the player attempts to use an item or perform an action that logically solves an obstacle (e.g., 'use key on door', 'light torch in dark room', 'pull lever'), you MUST:
            1.  **Narrate the success:** Describe how the environment changes (e.g., "The heavy iron lock clicks open," or "The torch illuminates a passage to the east.").
            2.  **Update Exits:** Add the new direction to the \`room.exits\` object (e.g., \`{ east: 'hidden_chamber_id' }\`). This effectively unlocks the door.
            3.  **Update Description:** Provide a new \`room.description\` that reflects the opened path or solved puzzle.
        -   If the player tries to go a direction that is blocked/locked, or lacks the required item, narrate the failure (e.g., "The door is locked. You see a keyhole shaped like a spider."). Do not change the state.

        **LOOT GENERATION RULES (Level ${state.player.level}):**
        -   **Triggers:** Loot should be generated when:
            1.  A monster is defeated.
            2.  A container (chest, crate, sarcophagus) is opened.
            3.  The player explicitly searches or scavenges a promising area (e.g., "search the debris", "loot the bodies", "scavenge the room").
        -   **Loot Tier:** ${lootTier.name}
        -   **Allowed Materials:** ${lootTier.materials}
        -   **Weapon Damage Range (value):** ${lootTier.weaponDmg}
        -   **Armor Defense Range (armor):** ${lootTier.armorDef}
        -   **Chance:** There is roughly a ${lootTier.dropChance * 100}% chance of finding an item. If generated, place it in \`inventory.add\` OR \`room.items\`.

        **XP AWARDS:**
        -   Award XP to the player for: Defeating monsters, discovering secrets, solving puzzles, or successfully scavenging valuable items.
        
        **RESPONSE INSTRUCTIONS:**
        1.  Your 'narration' is the objective description of what happens.
        2.  After crafting the narration, add an 'impDialogue' field. This should be a short, sarcastic, cowardly, or complaining comment from the Imp in the player's head, in the style of Gilbert Gottfried as Iago. Examples: "Oh, great, another dark room. I'm shocked.", "Are you SURE you want to fight that thing? It looks hungry!", "Finally, something shiny! Is it for me?". If the action is mundane, the Imp might not say anything.
        3.  If a monster is defeated, update its HP to 0 or remove it, and add its XP to the player. Place its loot in the room's items.
        4.  If the player solves a puzzle or finds significant loot via searching, add XP to the player.
        5.  If the player equips or unequips an item, you MUST update the \`player.equipped\` object. For equipping, provide the full item object in the correct slot. For unequipping, set the slot to \`null\`.
        `;
        
        const response = await chat.sendMessage({
            message: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: turnSchema,
                maxOutputTokens: 2048,
            }
        });

        const jsonText = response.text.trim();
        return cleanAndParseJson(jsonText) as GameStateUpdate;

    } catch (error) {
        console.error("Error processing turn with Gemini:", error);
        // Provide a default "error" response to keep the game from crashing
        return {
            narration: "The fabric of reality shimmers and warps, and your action fizzles into nothingness. Something went wrong.",
            gameOver: false
        };
    }
}

// --- AMBIENT SOUND QUERY GENERATION ---
export async function getAmbientSoundQuery(room: Room): Promise<string> {
    const aiInstance = getAI();
    const systemInstruction = `You are an expert sound designer for a video game. Your task is to analyze a description of a fantasy RPG location and provide a few concise, powerful keywords for searching a sound effects library.`;

    const prompt = `Based on the following room details, provide 2-4 keywords that would find the perfect ambient background audio track. The keywords should focus on atmosphere, key sounds, and mood. Do not use punctuation.

    Room Name: ${room.name}
    Description: ${room.description}
    ${room.monster ? `Monster Present: ${room.monster.name}` : ''}

    Example keywords for a damp cave: "cave dripping water echo"
    Example keywords for a haunted library: "haunting wind paper rustle whisper"
    Example keywords for a blacksmith's forge: "fire crackle hammer metal clang"

    Provide only the keywords, separated by spaces.`;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { systemInstruction },
        });
        return response.text.trim().replace(/,/g, ''); // Ensure no commas
    } catch (error) {
        console.error("Error generating ambient sound query:", error);
        return room.name; // Fallback to room name
    }
}

// --- HINT GENERATION ---
export async function getHint(state: GameState): Promise<string> {
    const aiInstance = getAI();
    const currentRoom = state.world.rooms[state.player.location];
    const systemInstruction = `You are a cryptic and wise guide in a fantasy text adventure game. Your goal is to provide a subtle, in-character hint to a player who seems to be stuck. Do not give the answer away directly. Instead, nudge them in the right direction.`;

    const prompt = `The player seems to be stuck. Here is their current situation:

    **Player Stats:**
    - Class: ${state.player.class}
    - Level: ${state.player.level}
    - Health: ${state.player.hp}/${state.player.maxHp}
    - Inventory: ${state.player.inventory.map(i => i.name).join(', ') || 'Empty'}

    **Current Location: ${currentRoom.name}**
    - Description: ${currentRoom.description}
    - Exits: ${Object.keys(currentRoom.exits).join(', ')}
    - Items in room: ${currentRoom.items.map(i => i.name).join(', ') || 'None'}
    - Monster: ${currentRoom.monster?.name || 'None'}
    - Examinable details: ${currentRoom.details ? Object.keys(currentRoom.details).join(', ') : 'None'}

    **Overall Goal (Implicit):**
    The player needs to explore, find items, defeat monsters, and solve puzzles to progress. Analyze the current state and provide a single, short, evocative hint.

    **Hinting Rules:**
    - Focus on the most immediate, solvable problem. Is there a monster to fight? An obvious item to take? An exit they haven't tried? A key in their inventory that might fit a lock they've seen?
    - Phrase the hint as a feeling, a thought, or an observation. For example: "A faint draft seems to come from the west wall," or "The weight of the iron key in your pocket feels significant here," or "The goblin seems to be guarding something shiny."
    - The hint must be a single sentence.
    - Do not break character. Do not say "Hint:" or "You should...".

    Provide only the hint text.`;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating hint with Gemini:", error);
        return "You feel a sense of clarity, but the thought vanishes before you can grasp it."; // Fallback hint
    }
}


// --- IMAGE GENERATION ---
export async function generateImage(prompt: string): Promise<string> {
  const aiInstance = getAI();
  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        // Set aspect ratio to 16:9 for cinematic landscape feel
        imageConfig: {
            aspectRatio: '16:9'
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    // Return a unique random seed for picsum to prevent browser caching of the fallback image.
    // This ensures that even if the API fails, the user doesn't see the exact same 6 images.
    const seed = Math.floor(Math.random() * 1000000);
    return `https://picsum.photos/seed/${seed}/1024/576`; 
  }
}
