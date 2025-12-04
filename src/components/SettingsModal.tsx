import { X, FlaskConical, ExternalLink, Palette, Copy, Check, Link } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useState, useMemo } from 'react';
import { error } from '../lib/logger';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEST_MESSAGES = [
  { username: 'TestViewer1', amount: 500, message: 'Hello! Testing the TTS queue!', type: 'bits' as const },
  { username: 'GenerousDonor', amount: 25, message: 'Love your streams! Keep it up!', type: 'donation' as const },
  { username: 'BitsBoss', amount: 1000, message: 'Wooooo! Big bits coming through!', type: 'bits' as const },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setMinBits, addItem, providerConnection } = useAppStore();
  const [copied, setCopied] = useState(false);

  // Generate complete overlay URL with all parameters
  const overlayUrl = useMemo(() => {
    const baseUrl = `${window.location.origin}/overlay`;
    const params = new URLSearchParams();
    
    // Auto-unlock audio for OBS (skips the "click to enable" prompt)
    params.set('unlock', 'true');
    
    // Add provider credentials if connected
    if (providerConnection.provider !== 'none' && providerConnection.accessToken) {
      params.set('provider', providerConnection.provider);
      params.set('token', providerConnection.accessToken);
      
    }
    
    // Add settings
    if (settings.minBits > 0) {
      params.set('minBits', settings.minBits.toString());
    }
    
    // Add TTS voice if not default
    if (settings.overlay.ttsVoice && settings.overlay.ttsVoice !== 'default') {
      params.set('voice', settings.overlay.ttsVoice);
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [providerConnection, settings.minBits, settings.overlay.ttsVoice]);

  const handleCopyOverlayUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      error('Failed to copy:', err);
    }
  };

  const handleAddTestMessage = () => {
    const randomMsg = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
    addItem({
      ...randomMsg,
      username: `${randomMsg.username}_${Math.floor(Math.random() * 1000)}`,
    });
  };

  const handleOpenOverlaySettings = () => {
    window.open('/overlay-settings', '_blank');
  };

  const handleOpenOverlayPreview = () => {
    window.open(`${overlayUrl}&debug`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-void border border-bone-white/30 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-bone-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bone-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-bone-white" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Min Bits */}
          <div>
            <label className="block text-sm text-bone-white/70 mb-2">
              Minimum Bits/Amount for TTS
            </label>
            <input
              type="number"
              min="1"
              value={settings.minBits}
              onChange={(e) => setMinBits(parseInt(e.target.value, 10) || 1)}
              className="w-full px-4 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white focus:border-cerber-violet focus:outline-none"
            />
            <p className="text-xs text-bone-white/50 mt-1">
              Only alerts with this value or higher will be added to the queue.
            </p>
          </div>

          {/* OBS Overlay URL */}
          <div className="pt-4 border-t border-bone-white/20">
            <label className="text-sm text-bone-white/70 mb-2 flex items-center gap-2">
              <Link className="w-4 h-4" />
              OBS Browser Source URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={overlayUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white/80 text-xs font-mono truncate"
              />
              <button
                onClick={handleCopyOverlayUrl}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  copied 
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                    : 'bg-cerber-violet/20 border border-cerber-violet/50 text-cerber-violet hover:bg-cerber-violet/30'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-bone-white/50 mt-1">
              Copy this URL and paste it into OBS as a Browser Source.
            </p>
            {providerConnection.provider === 'none' && (
              <p className="text-xs text-yellow-400/80 mt-1">
                ⚠️ Connect to StreamElements first for a complete URL.
              </p>
            )}
            <button
              onClick={handleOpenOverlayPreview}
              className="mt-2 w-full px-4 py-2 bg-bone-white/10 hover:bg-bone-white/20 border border-bone-white/30 text-bone-white/80 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Preview Overlay
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Overlay Settings Button */}
          <div className="pt-4 border-t border-bone-white/20">
            <label className="block text-sm text-bone-white/70 mb-2">
              Overlay Appearance
            </label>
            <button
              onClick={handleOpenOverlaySettings}
              className="w-full px-4 py-3 bg-cerber-violet/20 hover:bg-cerber-violet/30 border border-cerber-violet/50 text-cerber-violet font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Customize Overlay Appearance
              <ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-xs text-bone-white/50 mt-1">
              Opens in a new tab - customize colors, fonts, images, and more.
            </p>
          </div>

          {/* Test Message Button */}
          <div className="pt-4 border-t border-bone-white/20">
            <label className="block text-sm text-bone-white/70 mb-2">
              Testing
            </label>
            <button
              onClick={handleAddTestMessage}
              className="w-full px-4 py-3 bg-squeaky-pink/20 hover:bg-squeaky-pink/30 border border-squeaky-pink/50 text-squeaky-pink font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              Add Test Message
            </button>
            <p className="text-xs text-bone-white/50 mt-1">
              Add a random test message to the queue for testing.
            </p>
          </div>

          {/* Connection Info */}
          <div className="pt-4 border-t border-bone-white/20">
            <label className="block text-sm text-bone-white/70 mb-2">
              Connection Status
            </label>
            {providerConnection.isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-bone-white">
                  Connected to{' '}
                  <span className="text-cerber-violet font-semibold">
                    StreamElements
                  </span>
                  {providerConnection.username && ` as ${providerConnection.username}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm text-bone-white/60">
                  No provider connected - using local browser TTS
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-cerber-violet hover:bg-cerber-violet/80 text-bone-white font-semibold rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
