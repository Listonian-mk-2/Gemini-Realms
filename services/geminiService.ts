
import { GoogleGenAI, Modality, Type } from "@google/genai";

let ai: GoogleGenAI;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export interface CommandContext {
  exits: string[];
  itemsInRoom: string[];
  inventory: string[];
  monster?: string;
  examinableObjects?: string[];
}

export interface InterpretedCommand {
  action: string;
  target: string;
}

const commandSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: 'The primary verb or action the user wants to perform. Should be one of: go, take, drop, look, inventory, equip, use, attack, help, save, load, unknown.',
        },
        target: {
            type: Type.STRING,
            description: 'The noun or target of the action. For movement, this is the direction. For items, the item name. For combat, the monster name. Can be empty for actions like "look" or "inventory".'
        }
    },
    required: ['action', 'target']
};

export async function interpretCommand(command: string, context: CommandContext): Promise<InterpretedCommand | null> {
    const aiInstance = getAI();
    const validActions = ['go', 'take', 'drop', 'inventory', 'look', 'attack', 'use', 'equip', 'help', 'save', 'load'];
    
    const systemInstruction = `You are a highly intelligent command parser for a classic text-based adventure game. Your sole purpose is to receive a natural language command from a player and convert it into a strict JSON format with an 'action' and a 'target'. You must be flexible and forgiving with user input, understanding common synonyms, ignoring irrelevant words, and correctly identifying targets based on the provided game context.`;
    
    const prompt = `The player has issued a command: "${command}"

    Analyze this command within the current game context:
    - Player is in a room with these exits: ${context.exits.join(', ') || 'none'}.
    - Items available to take in the room: ${context.itemsInRoom.join(', ') || 'none'}.
    - Items in the player's inventory: ${context.inventory.join(', ') || 'none'}.
    - Specific objects that can be examined: ${context.examinableObjects?.join(', ') || 'none'}.
    ${context.monster ? `- A hostile monster is present: ${context.monster}.` : ''}

    Your task is to map the player's command to one of the following valid actions: ${validActions.join(', ')}.

    Follow these rules STRICTLY:
    1.  **Action Mapping**:
        -   'go', 'walk', 'move', 'head' -> "go"
        -   'take', 'get', 'pick up', 'grab' -> "take"
        -   'drop', 'leave' -> "drop"
        -   'look', 'examine', 'inspect', 'l' -> "look"
        -   'inventory', 'i', 'bag' -> "inventory"
        -   'equip', 'wear', 'wield' -> "equip"
        -   'use', 'drink', 'read' -> "use"
        -   'attack', 'fight', 'hit', 'kill' -> "attack"
        -   'help', '?' -> "help"
        -   'save' -> "save"
        -   'load' -> "load"

    2.  **Target Identification**:
        -   For 'go', the target must be one of the available exits.
        -   For 'take', the target must be one of the items in the room.
        -   For 'drop', 'equip', 'use', the target must be one of the items in the inventory.
        -   For 'look' or 'examine': If the player specifies a target (e.g., "look at fountain"), the target MUST be one of the examinable objects, items in the room, or items in inventory.
        -   For 'attack', the target should be the monster's name if present.
        -   **Be smart about matching targets**: Ignore articles ('a', 'the'). If the player says "pick up rusty sword" and "Rusty Goblin Sword" is in the room, the target is "Rusty Goblin Sword". If they say "use potion" and "Healing Potion" is in inventory, the target is "Healing Potion".

    3.  **No Target Actions**: For commands like 'look' (without a target), 'inventory', 'attack' (without a target, implying the present monster), 'help', 'save', 'load', the 'target' field in the JSON should be an empty string. If the user says "look at room", treat it as a 'look' with no target.

    4.  **Unknown Command**: If the command is completely nonsensical, ambiguous, or cannot be mapped to any valid action and target based on the context, set the 'action' to "unknown" and 'target' to an empty string. Do not guess.`;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: commandSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed as InterpretedCommand;

    } catch (error) {
        console.error("Error interpreting command with Gemini:", error);
        return { action: 'unknown', target: '' };
    }
}


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
    const seed = Math.floor(Math.random() * 1000000);
    return `https://picsum.photos/seed/${seed}/1024/576`; 
  }
}
