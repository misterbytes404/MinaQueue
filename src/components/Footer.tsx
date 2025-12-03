import { Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useVoices } from '../hooks/useVoices';

export function Footer() {
  const { settings, setVolume, setSelectedVoiceURI } = useAppStore();
  const { voices, isLoading } = useVoices();

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
            className="w-32 accent-cerber-violet"
          />
          <span className="text-sm text-bone-white/70 w-12">
            {Math.round(settings.volume * 100)}%
          </span>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm text-bone-white/70">Voice:</label>
          <select
            value={settings.selectedVoiceURI || ''}
            onChange={(e) => setSelectedVoiceURI(e.target.value || null)}
            disabled={isLoading}
            className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white text-sm focus:border-cerber-violet focus:outline-none"
          >
            <option value="">Default Voice</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          {isLoading && (
            <span className="text-sm text-bone-white/50">Loading voices...</span>
          )}
        </div>
      </div>
    </footer>
  );
}
