import { useState } from 'react';
import { ExternalLink, Check, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { streamLabsService } from '../services/streamlabs';
import { streamElementsService } from '../services/streamelements';
import { error } from '../lib/logger';
import type { AlertProvider } from '../types';

export function ProviderSetup() {
  const { 
    providerConnection, 
    setProviderConnection, 
    setConnectionStatus,
    addItem,
    settings,
  } = useAppStore();
  
  const [jwtToken, setJwtToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProviderSelect = (provider: AlertProvider) => {
    setProviderConnection({ provider });
    setErrorMessage(null);
  };

  const handleStreamLabsConnect = () => {
    const authUrl = streamLabsService.getAuthUrl();
    // Open OAuth popup
    window.open(authUrl, 'StreamLabs Auth', 'width=600,height=800');
  };

  const handleStreamElementsConnect = async () => {
    if (!jwtToken.trim()) {
      setErrorMessage('Please enter your JWT token');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const isValid = await streamElementsService.validateToken(jwtToken);
      
      if (!isValid) {
        setErrorMessage('Invalid JWT token. Please check and try again.');
        setIsConnecting(false);
        return;
      }

      // Connect and start receiving events
      streamElementsService.connectWithToken(
        jwtToken,
        (item) => {
          if (item.amount >= settings.minBits) {
            addItem(item);
          }
        },
        (connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        }
      );

      setProviderConnection({
        provider: 'streamelements',
        accessToken: jwtToken,
        isConnected: true,
      });
      setConnectionStatus('connected');
    } catch (err) {
      setErrorMessage('Failed to connect. Please try again.');
      error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (providerConnection.provider === 'streamelements') {
      streamElementsService.disconnect();
    } else if (providerConnection.provider === 'streamlabs') {
      streamLabsService.disconnect();
    }
    
    setProviderConnection({
      provider: 'none',
      isConnected: false,
      accessToken: null,
      socketToken: null,
      username: null,
    });
    setConnectionStatus('disconnected');
    setJwtToken('');
  };

  // Already connected - show status
  if (providerConnection.isConnected) {
    return (
      <div className="bg-bg-void/50 border border-bone-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-bone-white font-semibold">
                Connected to {providerConnection.provider === 'streamlabs' ? 'StreamLabs' : 'StreamElements'}
              </p>
              <p className="text-sm text-bone-white/60">
                Receiving alerts • Queue synced to overlay
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-hellfire-red/20 text-hellfire-red border border-hellfire-red/50 rounded-lg hover:bg-hellfire-red/30 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-void/50 border border-bone-white/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-bone-white mb-4">Connect Alert Provider</h3>
      <p className="text-sm text-bone-white/60 mb-6">
        Connect to your streaming alert service to control TTS queues.
      </p>

      {/* Provider Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* StreamLabs */}
        <button
          onClick={() => handleProviderSelect('streamlabs')}
          className={`p-4 rounded-xl border-2 transition-all ${
            providerConnection.provider === 'streamlabs'
              ? 'border-cerber-violet bg-cerber-violet/20'
              : 'border-bone-white/30 hover:border-bone-white/50'
          }`}
        >
          <div className="text-2xl mb-2">🟢</div>
          <p className="font-semibold text-bone-white">StreamLabs</p>
          <p className="text-xs text-bone-white/50">OAuth Login</p>
        </button>

        {/* StreamElements */}
        <button
          onClick={() => handleProviderSelect('streamelements')}
          className={`p-4 rounded-xl border-2 transition-all ${
            providerConnection.provider === 'streamelements'
              ? 'border-cerber-violet bg-cerber-violet/20'
              : 'border-bone-white/30 hover:border-bone-white/50'
          }`}
        >
          <div className="text-2xl mb-2">🟡</div>
          <p className="font-semibold text-bone-white">StreamElements</p>
          <p className="text-xs text-bone-white/50">JWT Token</p>
        </button>
      </div>

      {/* StreamLabs Setup */}
      {providerConnection.provider === 'streamlabs' && (
        <div className="space-y-4">
          <div className="p-4 bg-bone-white/5 rounded-lg">
            <p className="text-sm text-bone-white/80 mb-3">
              Click below to authorize MinaQueue with your StreamLabs account.
            </p>
            <button
              onClick={handleStreamLabsConnect}
              className="w-full px-4 py-3 bg-cerber-violet hover:bg-cerber-violet/80 text-bone-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Connect with StreamLabs
            </button>
          </div>
          <p className="text-xs text-bone-white/40">
            Note: You'll need to set up environment variables for StreamLabs OAuth. See README for details.
          </p>
        </div>
      )}

      {/* StreamElements Setup */}
      {providerConnection.provider === 'streamelements' && (
        <div className="space-y-4">
          <div className="p-4 bg-bone-white/5 rounded-lg">
            <p className="text-sm text-bone-white/80 mb-3">
              Enter your JWT token from StreamElements:
            </p>
            <ol className="text-xs text-bone-white/60 mb-4 list-decimal list-inside space-y-1">
              <li>Go to <a href="https://streamelements.com/dashboard/account/channels" target="_blank" rel="noopener noreferrer" className="text-cerber-violet hover:underline">StreamElements Dashboard</a></li>
              <li>Click "Show secrets"</li>
              <li>Copy your JWT Token</li>
            </ol>
            <input
              type="password"
              value={jwtToken}
              onChange={(e) => setJwtToken(e.target.value)}
              placeholder="Paste your JWT token here..."
              className="w-full px-4 py-2 bg-bg-void border border-bone-white/30 rounded-lg text-bone-white placeholder-bone-white/40 focus:border-cerber-violet focus:outline-none mb-3"
            />
            <button
              onClick={handleStreamElementsConnect}
              disabled={isConnecting || !jwtToken.trim()}
              className="w-full px-4 py-3 bg-cerber-violet hover:bg-cerber-violet/80 disabled:bg-cerber-violet/50 disabled:cursor-not-allowed text-bone-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-hellfire-red/20 border border-hellfire-red/50 rounded-lg">
          <p className="text-sm text-hellfire-red">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
