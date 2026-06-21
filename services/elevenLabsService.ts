export const ELEVENLABS_VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (American, Calm)' },
    { id: '29vD33N1CtxCmqQRPO9k', name: 'Drew (American, Upbeat)' },
    { id: '5Q0t7uMcjvnagumLfvZi', name: 'Clyde (American, Deep)' },
    { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Paul (American, Raspy)' },
    { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin (Irish, Wise)' },
];

/**
 * Verifies if a voice ID is valid by fetching its details.
 */
export async function getVoiceDetails(voiceId: string, apiKey: string): Promise<any> {
    const VOICE_URL = `https://api.elevenlabs.io/v1/voices/${voiceId}`;
    try {
        const response = await fetch(VOICE_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'xi-api-key': apiKey,
            },
            cache: 'no-cache',
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.detail?.message) {
                    errorMessage = errorData.detail.message;
                } else if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                // Ignore if parsing fails, use original HTTP error
            }
            throw new Error(`ElevenLabs API Error: ${errorMessage}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to validate voice ID:", error);
        if (error instanceof Error && error.message.startsWith('ElevenLabs API Error:')) {
            throw error; // Re-throw our specific, formatted error
        }
        // Wrap generic/network errors
        throw new Error(`ElevenLabs API Error: Failed to connect to service. Check network or API status.`);
    }
}


export async function getNarrationAudio(
    text: string, 
    apiKey: string,
    audioContext: AudioContext,
    voiceId: string
): Promise<AudioBuffer> {
    const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    try {
        const response = await fetch(ELEVENLABS_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
            cache: 'no-cache',
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                // Try to parse the JSON error body for a more specific message
                const errorData = await response.json();
                if (errorData.detail?.message) {
                    errorMessage = errorData.detail.message;
                } else if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                // JSON parsing failed, stick with the status text
            }
            // Prefix all errors from this service for easier catching
            throw new Error(`ElevenLabs API Error: ${errorMessage}`);
        }

        const audioData = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        
        return audioBuffer;

    } catch (error) {
        console.error("Failed to fetch or decode narration audio:", error);
        if (error instanceof Error && error.message.startsWith('ElevenLabs API Error:')) {
            throw error; // Re-throw our specific, formatted error
        }
        // Wrap generic/network errors
        throw new Error(`ElevenLabs API Error: Failed to connect to service. Check network or API status.`);
    }
}