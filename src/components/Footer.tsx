import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCloudVoicesGroupedByLanguage, testCloudVoice, DEFAULT_CLOUD_VOICE } from '../services/cloud-tts';

export function Footer() {
  const { settings, setVolume, updateOverlaySettings } = useAppStore();
  const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);
  
  const cloudVoiceGroups = getCloudVoicesGroupedByLanguage();

  const handleTestVoice = () => {
    if (voiceTestPlaying) return;
    
    setVoiceTestPlaying(true);
    const voice = settings.overlay.ttsVoice || DEFAULT_CLOUD_VOICE;
    console.log('[Footer] Testing voice:', voice, 'volume:', settings.volume);
    
    const { promise } = testCloudVoice(voice, settings.volume);
    promise
      .then(() => console.log('[Footer] Voice test completed'))
      .catch((err) => console.error('[Footer] Voice test error:', err))
      .finally(() => setVoiceTestPlaying(false));
  };

  return (
    <footer className="border-t border-bone-white/20 px-6 py-4">
      <div className="flex items-center gap-6">
        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-cerber-violet" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-cerber-violet"
          />
          <span className="text-sm text-bone-white/70 w-10">
            {Math.round(settings.volume * 100)}%
          </span>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm text-bone-white/70">Voice:</label>
          <select
            value={settings.overlay.ttsVoice || DEFAULT_CLOUD_VOICE}
            onChange={(e) => {
              console.log('[Footer] Voice changed to:', e.target.value);
              updateOverlaySettings({ ttsVoice: e.target.value });
            }}
            className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white text-sm focus:border-cerber-violet focus:outline-none"
          >
            {Object.entries(cloudVoiceGroups).map(([language, voices]) => (
              <optgroup key={language} label={language}>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          
          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            disabled={voiceTestPlaying}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              voiceTestPlaying
                ? 'bg-bone-white/10 text-bone-white/50 cursor-not-allowed'
                : 'bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 hover:bg-cerber-violet/30'
            }`}
          >
            {voiceTestPlaying ? 'Playing...' : 'Test'}
          </button>
        </div>
        
        <span className="text-xs text-green-400">✓ Works in OBS</span>
      </div>
    </footer>
  );
}
