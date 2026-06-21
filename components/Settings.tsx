import React, { useState, useEffect, useMemo } from 'react';
import { ELEVENLABS_VOICES, getVoiceDetails } from '../services/elevenLabsService';
import { CustomVoice } from '../game/types';

interface SettingsProps {
    narrationEnabled: boolean;
    apiKey: string | null;
    narrationVoiceId: string;
    systemVoiceId: string;
    customVoices: CustomVoice[];
    impEnabled: boolean;
    impVoiceId: string;
    ambientSoundEnabled: boolean;
    ambientSoundVolume: number;
    pixabayApiKey: string | null;
    dispatch: React.Dispatch<any>;
}

// Separate component for adding custom voices, which has its own save/validation cycle.
const AddVoiceForm: React.FC<{ apiKey: string | null; dispatch: React.Dispatch<any>; onCancel: () => void; existingVoices: CustomVoice[] }> = 
    ({ apiKey, dispatch, onCancel, existingVoices }) => {
    
    const [voiceName, setVoiceName] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!voiceName.trim() || !voiceId.trim()) {
            setError('Both name and ID are required.');
            return;
        }
        if (existingVoices.some(v => v.id === voiceId)) {
            setError('This voice ID has already been added.');
            return;
        }
        if (!apiKey) {
            setError('API Key must be set to validate a new voice.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        try {
            await getVoiceDetails(voiceId, apiKey);
            dispatch({ type: 'ADD_CUSTOM_VOICE', payload: { id: voiceId, name: voiceName } });
            onCancel(); // Close form on success
        } catch (e) {
            if (e instanceof Error) {
                setError(`Validation failed: ${e.message.replace('ElevenLabs API Error: ', '')}`);
            } else {
                setError('An unknown error occurred during validation.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-3 bg-gray-900 rounded-md space-y-3 mt-2">
            <input type="text" value={voiceName} onChange={e => setVoiceName(e.target.value)} placeholder="Voice Nickname (e.g., My Voice)" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
            <input type="text" value={voiceId} onChange={e => setVoiceId(e.target.value)} placeholder="Voice ID from ElevenLabs" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md transition-colors text-sm">Cancel</button>
                <button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                    {isLoading ? 'Verifying...' : 'Save Voice'}
                </button>
            </div>
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = (props) => {
    const { dispatch, customVoices } = props;

    // Local state for the entire form to allow for a single save action
    const [formState, setFormState] = useState({
        narrationEnabled: props.narrationEnabled,
        elevenLabsApiKey: props.apiKey || '',
        narrationVoiceId: props.narrationVoiceId,
        systemVoiceId: props.systemVoiceId,
        impEnabled: props.impEnabled,
        impVoiceId: props.impVoiceId,
        ambientSoundEnabled: props.ambientSoundEnabled,
        ambientSoundVolume: props.ambientSoundVolume,
        pixabayApiKey: props.pixabayApiKey || '',
    });
    
    // State to manage the save button's appearance and behavior
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isAddingVoice, setIsAddingVoice] = useState(false);

    // Determines if there are unsaved changes
    const isDirty = useMemo(() => {
        return formState.narrationEnabled !== props.narrationEnabled ||
               formState.elevenLabsApiKey !== (props.apiKey || '') ||
               formState.narrationVoiceId !== props.narrationVoiceId ||
               formState.systemVoiceId !== props.systemVoiceId ||
               formState.impEnabled !== props.impEnabled ||
               formState.impVoiceId !== props.impVoiceId ||
               formState.ambientSoundEnabled !== props.ambientSoundEnabled ||
               formState.ambientSoundVolume !== props.ambientSoundVolume ||
               formState.pixabayApiKey !== (props.pixabayApiKey || '');
    }, [formState, props]);

    // This effect syncs the local form state if props change from an external source.
    useEffect(() => {
        setFormState({
            narrationEnabled: props.narrationEnabled,
            elevenLabsApiKey: props.apiKey || '',
            narrationVoiceId: props.narrationVoiceId,
            systemVoiceId: props.systemVoiceId,
            impEnabled: props.impEnabled,
            impVoiceId: props.impVoiceId,
            ambientSoundEnabled: props.ambientSoundEnabled,
            ambientSoundVolume: props.ambientSoundVolume,
            pixabayApiKey: props.pixabayApiKey || '',
        });
    }, [props]);

    const handleChange = (field: keyof typeof formState, value: any) => {
        setFormState(prevState => ({ ...prevState, [field]: value }));
        if (saveStatus !== 'idle') setSaveStatus('idle');
    };

    const handleSaveSettings = () => {
        setSaveStatus('saving');
        dispatch({
            type: 'UPDATE_SETTINGS',
            payload: {
                ...formState,
                // Ensure null is dispatched for empty keys
                elevenLabsApiKey: formState.elevenLabsApiKey || null,
                pixabayApiKey: formState.pixabayApiKey || null,
            }
        });

        // Show "Saved!" message for a couple of seconds
        setTimeout(() => setSaveStatus('saved'), 200);
        setTimeout(() => setSaveStatus('idle'), 2200);
    };

    const handleRemoveVoice = (idToRemove: string) => {
        if (confirm('Are you sure you want to remove this custom voice?')) {
            dispatch({ type: 'REMOVE_CUSTOM_VOICE', payload: idToRemove });
        }
    };

    return (
        <div className="p-4 space-y-6 text-gray-300">
            <h2 className="text-2xl font-bold text-center border-b border-gray-600 pb-2 mb-4 text-red-400">Settings</h2>

            {/* Narration Settings */}
            <div>
                <h3 className="text-xl font-semibold mb-2">ElevenLabs Narration</h3>
                <p className="text-sm text-gray-400 mb-4">Enable immersive voice narration. Requires an API key from ElevenLabs.</p>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold">Enable Narration</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={formState.narrationEnabled} onChange={() => handleChange('narrationEnabled', !formState.narrationEnabled)} disabled={!formState.elevenLabsApiKey} />
                            <div className={`block w-14 h-8 rounded-full ${formState.narrationEnabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formState.narrationEnabled ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                    <div>
                        <label htmlFor="narrationVoice" className="block font-bold mb-1">Narrator Voice</label>
                        <select id="narrationVoice" value={formState.narrationVoiceId} onChange={e => handleChange('narrationVoiceId', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <optgroup label="Pre-made Voices">{ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                            {customVoices.length > 0 && <optgroup label="My Voices">{customVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="systemVoice" className="block font-bold mb-1">System Voice</label>
                        <select id="systemVoice" value={formState.systemVoiceId} onChange={e => handleChange('systemVoiceId', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <optgroup label="Pre-made Voices">{ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                            {customVoices.length > 0 && <optgroup label="My Voices">{customVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="apiKey" className="block font-bold mb-1">ElevenLabs API Key</label>
                        <input id="apiKey" type="password" value={formState.elevenLabsApiKey} onChange={(e) => handleChange('elevenLabsApiKey', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Enter your ElevenLabs API key" />
                    </div>
                </div>
            </div>

            {/* Imp Companion Settings */}
            <div className="pt-4 border-t border-gray-700">
                 <h3 className="text-xl font-semibold mb-2">Imp Companion</h3>
                 <p className="text-sm text-gray-400 mb-4">Enable a sarcastic, disembodied voice for witty commentary.</p>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold">Enable Imp</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={formState.impEnabled} onChange={() => handleChange('impEnabled', !formState.impEnabled)} disabled={!formState.elevenLabsApiKey} />
                            <div className={`block w-14 h-8 rounded-full ${formState.impEnabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formState.impEnabled ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                     <div>
                        <label htmlFor="impVoice" className="block font-bold mb-1">Imp Voice</label>
                        <select id="impVoice" value={formState.impVoiceId} onChange={e => handleChange('impVoiceId', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <optgroup label="Pre-made Voices">{ELEVENLABS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                            {customVoices.length > 0 && <optgroup label="My Voices">{customVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Ambient Sound Settings */}
            <div className="pt-4 border-t border-gray-700">
                <h3 className="text-xl font-semibold mb-2">Ambient Sound</h3>
                <p className="text-sm text-gray-400 mb-4">Enable dynamic background audio from Pixabay's audio library. <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Get your free API key here.</a></p>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold">Enable Ambient Sound</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={formState.ambientSoundEnabled} onChange={() => handleChange('ambientSoundEnabled', !formState.ambientSoundEnabled)} disabled={!formState.pixabayApiKey} />
                            <div className={`block w-14 h-8 rounded-full ${formState.ambientSoundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formState.ambientSoundEnabled ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                     <div>
                        <label htmlFor="volume" className="block font-bold mb-1">Volume</label>
                        <div className="flex items-center space-x-3">
                            <span>🔈</span>
                            <input type="range" min="0" max="1" step="0.05" value={formState.ambientSoundVolume} onChange={e => handleChange('ambientSoundVolume', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <span>🔊</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="pixabayKey" className="block font-bold mb-1">Pixabay API Key</label>
                        <input id="pixabayKey" type="text" value={formState.pixabayApiKey} onChange={(e) => handleChange('pixabayApiKey', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Enter your Pixabay API key" />
                    </div>
                </div>
            </div>
            
            {/* Save Button */}
            <div className="pt-4 mt-4 border-t border-gray-700">
                <button onClick={handleSaveSettings} disabled={!isDirty || saveStatus === 'saving'} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Settings Saved!' : 'Save Settings'}
                </button>
            </div>

            {/* Custom Voices Section */}
            <div className="pt-4 border-t border-gray-700">
                 <h3 className="text-xl font-semibold mb-2">My Custom Voices</h3>
                 <p className="text-sm text-gray-400 mb-2">Add voices from your ElevenLabs VoiceLab.</p>
                 <ul className="space-y-2 mb-2">
                    {customVoices.map(voice => (
                        <li key={voice.id} className="flex justify-between items-center bg-gray-700 p-2 rounded-md">
                            <span>{voice.name}</span>
                            <button onClick={() => handleRemoveVoice(voice.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">REMOVE</button>
                        </li>
                    ))}
                 </ul>
                 {isAddingVoice ? (
                    <AddVoiceForm apiKey={formState.elevenLabsApiKey} dispatch={dispatch} onCancel={() => setIsAddingVoice(false)} existingVoices={customVoices} />
                 ) : (
                    <button onClick={() => setIsAddingVoice(true)} disabled={!formState.elevenLabsApiKey} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Add New Voice
                    </button>
                 )}
                 {!formState.elevenLabsApiKey && <p className="text-xs text-yellow-400 mt-2">You must set and save an API key to add custom voices.</p>}
            </div>
        </div>
    );
};