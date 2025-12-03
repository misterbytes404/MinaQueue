import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { GateControl } from './components/GateControl';
import { QueueList } from './components/QueueList';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { ProviderSetup } from './components/ProviderSetup';
import { AuthCallback } from './components/AuthCallback';
import { OverlayMode } from './components/OverlayMode';
import { OverlaySettingsPage } from './components/OverlaySettingsPage';
import { useTTSQueue } from './hooks/useTTSQueue';
import { useAppStore } from './store/useAppStore';
import { useOverlayWS } from './hooks/useOverlayWS';
import { streamElementsService } from './services/streamelements';
import { streamLabsService } from './services/streamlabs';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { 
    providerConnection, 
    setConnectionStatus, 
    addItem, 
    settings,
    queue,
  } = useAppStore();
  const hasAttemptedReconnect = useRef(false);
  
  // Simple routing based on pathname
  const pathname = window.location.pathname;
  const isAuthCallback = pathname.includes('/auth/');
  const isOverlayMode = pathname === '/overlay';
  const isOverlaySettings = pathname.includes('/overlay-settings');
  
  // Initialize TTS queue manager
  const { forcePlay } = useTTSQueue();
  
  // WebSocket connection to overlay server (only for dashboard, not overlay)
  const shouldConnectWS = !isOverlayMode && !isAuthCallback && !isOverlaySettings;
  
  const handleWSConnect = useCallback(() => {
    console.log('[Dashboard] Connected to overlay server');
  }, []);
  
  const { isConnected: wsConnected, sendQueue, sendGate, sendSettings, sendPlay } = useOverlayWS({
    clientType: 'dashboard',
    onConnect: shouldConnectWS ? handleWSConnect : undefined,
  });

  // Broadcast queue changes to overlay
  useEffect(() => {
    if (wsConnected && shouldConnectWS) {
      console.log('[Dashboard] Broadcasting queue update:', queue.length, 'items');
      sendQueue(queue);
    }
  }, [queue, wsConnected, sendQueue, shouldConnectWS]);

  // Broadcast gate changes to overlay
  useEffect(() => {
    if (wsConnected && shouldConnectWS) {
      console.log('[Dashboard] Broadcasting gate:', settings.isOpen ? 'OPEN' : 'CLOSED');
      sendGate(settings.isOpen);
    }
  }, [settings.isOpen, wsConnected, sendGate, shouldConnectWS]);

  // Broadcast overlay settings changes
  useEffect(() => {
    if (wsConnected && shouldConnectWS && settings.overlay) {
      console.log('[Dashboard] Broadcasting overlay settings');
      sendSettings(settings.overlay);
    }
  }, [settings.overlay, wsConnected, sendSettings, shouldConnectWS]);

  // Handle play button - broadcast to overlay
  const handlePlayItem = useCallback((itemId: string) => {
    if (wsConnected) {
      sendPlay(itemId);
    }
    forcePlay(itemId);
  }, [wsConnected, sendPlay, forcePlay]);

  // Auto-reconnect to provider if we have stored credentials
  useEffect(() => {
    if (hasAttemptedReconnect.current || isOverlayMode || isAuthCallback) return;
    if (!providerConnection.accessToken) return;
    
    hasAttemptedReconnect.current = true;
    
    console.log('[Dashboard] Connecting to', providerConnection.provider);
    
    if (providerConnection.provider === 'streamelements') {
      streamElementsService.connectWithToken(
        providerConnection.accessToken,
        (item) => {
          if (item.amount >= settings.minBits) {
            addItem(item);
          }
        },
        (connected) => {
          console.log('[Dashboard] StreamElements:', connected ? 'connected' : 'disconnected');
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        }
      );
    } else if (providerConnection.provider === 'streamlabs' && providerConnection.socketToken) {
      streamLabsService.setAccessToken(providerConnection.accessToken);
      streamLabsService.connectSocket(
        providerConnection.socketToken,
        (item) => {
          if (item.amount >= settings.minBits) {
            addItem(item);
          }
        },
        (connected) => {
          console.log('[Dashboard] StreamLabs:', connected ? 'connected' : 'disconnected');
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        }
      );
    }
  }, [providerConnection.accessToken, providerConnection.provider, providerConnection.socketToken, settings.minBits, addItem, setConnectionStatus, isOverlayMode, isAuthCallback]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STREAMLABS_AUTH_SUCCESS') {
        window.location.reload();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Render OAuth callback page
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // Render OBS Overlay mode
  if (isOverlayMode) {
    return <OverlayMode />;
  }

  // Render Overlay Settings page
  if (isOverlaySettings) {
    return <OverlaySettingsPage />;
  }

  return (
    <div className="min-h-screen bg-bg-void flex flex-col">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <main className="flex-1 flex flex-col overflow-hidden px-4">
        {/* Connection Status */}
        <div className="flex justify-center gap-4 py-2 text-xs">
          <span className={providerConnection.isConnected ? 'text-green-400' : 'text-red-400'}>
            {providerConnection.isConnected ? '● StreamElements' : '○ StreamElements'}
          </span>
          <span className={wsConnected ? 'text-green-400' : 'text-yellow-400'}>
            {wsConnected ? '● Overlay Server' : '○ Overlay Server'}
          </span>
        </div>
        
        {/* Provider Setup - Show if not connected */}
        {!providerConnection.isConnected && (
          <div className="max-w-2xl mx-auto w-full py-4">
            <ProviderSetup />
          </div>
        )}
        
        <GateControl />
        <QueueList onPlayItem={handlePlayItem} />
      </main>
      
      <Footer />
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}

export default App;
