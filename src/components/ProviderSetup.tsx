import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { streamElementsService } from '../services/streamelements';
import { error } from '../lib/logger';

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
    streamElementsService.disconnect();
    
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
                Connected to StreamElements
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
      <h3 className="text-lg font-semibold text-bone-white mb-4">Connect to StreamElements</h3>
      <p className="text-sm text-bone-white/60 mb-6">
        Connect your StreamElements account to receive Cheer alerts.
      </p>

      {/* StreamElements Setup */}
      {(
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
