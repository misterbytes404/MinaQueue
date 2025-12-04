import { useState, useEffect, useRef, useCallback } from 'react';
import { info, debug } from './lib/logger';
import { Header } from './components/Header';
import { GateControl } from './components/GateControl';
import { QueueList } from './components/QueueList';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { ProviderSetup } from './components/ProviderSetup';
import { AuthCallback } from './components/AuthCallback';
import { OverlayMode } from './components/OverlayMode';
import { OverlaySettingsPage } from './components/OverlaySettingsPage';
import { useAppStore } from './store/useAppStore';
import { useOverlayWS, type WSMessageType } from './hooks/useOverlayWS';
import { streamElementsService } from './services/streamelements';
import { streamLabsService } from './services/streamlabs';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { 
    providerConnection, 
    setProviderConnection,
    setConnectionStatus, 
    addItem, 
    settings,
    queue,
    markItemPlayed,
  } = useAppStore();
  const hasAttemptedReconnect = useRef(false);
  
  // Simple routing based on pathname
  const pathname = window.location.pathname;
  const isAuthCallback = pathname.includes('/auth/');
  const isOverlayMode = pathname === '/overlay';
  const isOverlaySettings = pathname.includes('/overlay-settings');
  
  // WebSocket connection to overlay server (only for dashboard and settings page, not overlay)
  const shouldConnectWS = !isOverlayMode && !isAuthCallback;
  
  // Handle messages from overlay (e.g., when an alert finishes playing)
  const handleWSMessage = useCallback((message: WSMessageType) => {
    if (message.type === 'played') {
      info('[Dashboard] Overlay finished playing:', message.itemId);
      markItemPlayed(message.itemId);
    }
  }, [markItemPlayed]);
  
  const handleWSConnect = useCallback(() => {
    info('[Dashboard] Connected to overlay server');
  }, []);
  
  const { isConnected: wsConnected, sendQueue, sendGate, sendSettings, sendPlay, sendToken } = useOverlayWS({
    clientType: 'dashboard',
    onConnect: shouldConnectWS ? handleWSConnect : undefined,
    onMessage: shouldConnectWS ? handleWSMessage : undefined,
  });

  // Broadcast queue changes to overlay
  useEffect(() => {
    if (wsConnected && shouldConnectWS) {
      debug('[Dashboard] Broadcasting queue update:', queue.length, 'items');
      sendQueue(queue);
    }
  }, [queue, wsConnected, sendQueue, shouldConnectWS]);

  // Broadcast gate changes to overlay
  useEffect(() => {
    if (wsConnected && shouldConnectWS) {
      debug('[Dashboard] Broadcasting gate:', settings.isOpen ? 'OPEN' : 'CLOSED');
      sendGate(settings.isOpen);
    }
  }, [settings.isOpen, wsConnected, sendGate, shouldConnectWS]);

  // Send JWT token to overlay server for TTS API
  useEffect(() => {
    if (wsConnected && shouldConnectWS && providerConnection.accessToken) {
      debug('[Dashboard] Sending JWT token to overlay server');
      sendToken(providerConnection.accessToken);
    }
  }, [wsConnected, shouldConnectWS, providerConnection.accessToken, sendToken]);

  // Broadcast TTS settings changes to overlay
  useEffect(() => {
    if (wsConnected && shouldConnectWS) {
      debug('[Dashboard] Broadcasting TTS settings - voice:', settings.overlay.ttsVoice, 'volume:', settings.overlay.ttsVolume);
      sendSettings(settings.overlay);
    }
  }, [settings.overlay.ttsVoice, settings.overlay.ttsVolume, wsConnected, sendSettings, shouldConnectWS]);

  // Handle play button - broadcast to overlay (TTS happens on overlay side)
  const handlePlayItem = useCallback((itemId: string) => {
    if (wsConnected) {
      sendPlay(itemId);
    } else {
      // Fallback: if overlay not connected, mark as played locally
      markItemPlayed(itemId);
    }
  }, [wsConnected, sendPlay, markItemPlayed]);

  // Auto-reconnect to provider if we have stored credentials
  useEffect(() => {
    if (hasAttemptedReconnect.current || isOverlayMode || isAuthCallback) return;
    if (!providerConnection.accessToken) return;
    
    hasAttemptedReconnect.current = true;
    
    info('[Dashboard] Reconnecting to', providerConnection.provider);
    
    if (providerConnection.provider === 'streamelements') {
      streamElementsService.connectWithToken(
        providerConnection.accessToken,
        (item) => {
          if (item.amount >= settings.minBits) {
            addItem(item);
          }
        },
        (connected) => {
          info('[Dashboard] StreamElements:', connected ? 'connected' : 'disconnected');
          setConnectionStatus(connected ? 'connected' : 'disconnected');
          setProviderConnection({ isConnected: connected });
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
          info('[Dashboard] StreamLabs:', connected ? 'connected' : 'disconnected');
          setConnectionStatus(connected ? 'connected' : 'disconnected');
          setProviderConnection({ isConnected: connected });
        }
      );
    }
  }, [providerConnection.accessToken, providerConnection.provider, providerConnection.socketToken, settings.minBits, addItem, setConnectionStatus, setProviderConnection, isOverlayMode, isAuthCallback]);

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
    return <OverlaySettingsPage wsConnected={wsConnected} onSendSettings={sendSettings} />;
  }

  return (
    <div className="min-h-screen bg-bg-void flex flex-col">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <main className="flex-1 flex flex-col overflow-hidden px-4">
        {/* Connection Status */}
        <div className="flex justify-center gap-4 py-2 text-xs">
          <span className={providerConnection.isConnected ? 'text-green-400' : 'text-red-400'}>
            {providerConnection.isConnected 
              ? `● ${providerConnection.provider === 'streamlabs' ? 'StreamLabs' : 'StreamElements'}` 
              : `○ ${providerConnection.provider !== 'none' ? (providerConnection.provider === 'streamlabs' ? 'StreamLabs' : 'StreamElements') : 'No Provider'}`
            }
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
