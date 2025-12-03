import { useEffect, useCallback, useRef, useState } from 'react';
import { AlertDisplay } from './AlertDisplay';
import type { QueueItem, OverlaySettings } from '../types';
import { useOverlayWS, type WSMessageType } from '../hooks/useOverlayWS';

/**
 * OBS Overlay Mode - WebSocket Client
 * 
 * Connects to the overlay server (ws://localhost:5175) to receive:
 * - Gate state changes from dashboard
 * - Queue updates
 * - Settings updates
 * - Skip/Clear commands
 * 
 * This runs as an OBS Browser Source and displays alerts.
 * 
 * URL Parameters:
 * - debug: Show debug info overlay
 * 
 * Keyboard Controls (when browser has focus):
 * - Space or G: Toggle gate open/closed (sends to server)
 * - S: Skip current alert
 * - C: Clear all pending alerts
 */

interface OverlayState {
  queue: QueueItem[];
  gateOpen: boolean;
}

const defaultOverlaySettings: OverlaySettings = {
  alertImageUrl: null,
  alertImageSize: 100,
  fontFamily: 'system-ui',
  fontSize: 24,
  usernameColor: '#FF99CC',
  amountColor: '#FFD700',
  messageColor: '#F5E6D3',
  alertBackgroundColor: '#B766D6',
  alertBorderColor: '#FF99CC',
  alertDuration: 5000,
  showAmount: true,
  showMessage: true,
};

export function OverlayMode() {
  const params = new URLSearchParams(window.location.search);
  const showDebug = params.has('debug');
  
  const [state, setState] = useState<OverlayState>({
    queue: [],
    gateOpen: true,
  });
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(defaultOverlaySettings);
  const [volume] = useState(1);
  const [ttsFinished, setTtsFinished] = useState(true); // Track if TTS has finished
  
  const lastPlayingId = useRef<string | null>(null);
  const lastCompletedTime = useRef<number>(0);
  const DELAY_BETWEEN_ALERTS = 2000; // 2 seconds between alerts

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WSMessageType) => {
    console.log('[Overlay] Received:', message.type);
    
    switch (message.type) {
      case 'gate':
        setState(prev => ({ ...prev, gateOpen: message.isOpen }));
        break;
        
      case 'queue':
        setState(prev => ({ ...prev, queue: message.queue }));
        break;
        
      case 'settings':
        setOverlaySettings(message.settings);
        break;
        
      case 'state':
        setState(prev => ({ 
          ...prev, 
          gateOpen: message.gateOpen,
          queue: message.queue,
        }));
        if (message.settings) {
          setOverlaySettings(message.settings);
        }
        break;
        
      case 'skip':
        window.speechSynthesis.cancel();
        setTtsFinished(true);
        lastCompletedTime.current = Date.now();
        setState(prev => ({
          ...prev,
          queue: prev.queue.map(item => 
            item.status === 'playing' ? { ...item, status: 'played' as const } : item
          ),
        }));
        lastPlayingId.current = null;
        break;
        
      case 'clear':
        setState(prev => ({
          ...prev,
          queue: prev.queue.filter(item => item.status !== 'pending'),
        }));
        break;
        
      case 'play':
        setState(prev => ({
          ...prev,
          queue: prev.queue.map(item => 
            item.id === message.itemId ? { ...item, status: 'playing' as const } : item
          ),
        }));
        break;
        
      case 'alert':
        // New alert from dashboard
        setState(prev => ({
          ...prev,
          queue: [...prev.queue, message.item],
        }));
        break;
    }
  }, []);

  const { isConnected, sendGate, sendSkip, sendClear } = useOverlayWS({
    clientType: 'overlay',
    onMessage: handleMessage,
  });

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'g':
          e.preventDefault();
          // Toggle and tell server
          setState(prev => {
            const newGateOpen = !prev.gateOpen;
            sendGate(newGateOpen);
            return { ...prev, gateOpen: newGateOpen };
          });
          break;
        case 's':
          e.preventDefault();
          sendSkip();
          break;
        case 'c':
          e.preventDefault();
          sendClear();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendGate, sendSkip, sendClear]);

  // Set transparent background for OBS
  useEffect(() => {
    document.body.classList.add('overlay-mode');
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    return () => document.body.classList.remove('overlay-mode');
  }, []);

  // Find items
  const playingItem = state.queue.find(item => item.status === 'playing');
  const nextPendingItem = state.queue.find(item => item.status === 'pending');
  
  // Auto-start next pending item when gate is open (with 2 second delay)
  useEffect(() => {
    if (!state.gateOpen || playingItem || !nextPendingItem) return;
    
    const timeSinceLastCompleted = Date.now() - lastCompletedTime.current;
    const delayNeeded = Math.max(100, DELAY_BETWEEN_ALERTS - timeSinceLastCompleted);
    
    console.log('[Overlay] Scheduling next alert in', delayNeeded, 'ms');
    
    const timeoutId = setTimeout(() => {
      console.log('[Overlay] Auto-starting:', nextPendingItem.username);
      setTtsFinished(false); // TTS starting
      setState(prev => ({
        ...prev,
        queue: prev.queue.map(item => 
          item.id === nextPendingItem.id ? { ...item, status: 'playing' as const } : item
        ),
      }));
    }, delayNeeded);
    
    return () => clearTimeout(timeoutId);
  }, [state.gateOpen, playingItem, nextPendingItem]);

  // TTS - play when item starts playing
  useEffect(() => {
    if (!playingItem || !state.gateOpen) {
      return;
    }
    
    // Only play if this is a new item
    if (lastPlayingId.current === playingItem.id) {
      return;
    }
    
    console.log('[Overlay] Playing TTS for:', playingItem.username);
    lastPlayingId.current = playingItem.id;
    
    const synth = window.speechSynthesis;
    synth.cancel(); // Cancel any previous speech
    
    if (volume > 0 && playingItem.message) {
      const utterance = new SpeechSynthesisUtterance(
        `${playingItem.username} says: ${playingItem.message}`
      );
      utterance.volume = volume;
      
      // Mark TTS as finished when it completes
      utterance.onend = () => {
        console.log('[Overlay] TTS finished');
        setTtsFinished(true);
      };
      
      utterance.onerror = () => {
        console.log('[Overlay] TTS error');
        setTtsFinished(true);
      };
      
      synth.speak(utterance);
    } else {
      // No message to speak, mark as finished immediately
      setTtsFinished(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingItem?.id, state.gateOpen]);

  // Cancel TTS when gate closes
  useEffect(() => {
    if (!state.gateOpen) {
      window.speechSynthesis.cancel();
      setTtsFinished(true);
    }
  }, [state.gateOpen]);

  // Mark alert complete
  const handleAlertComplete = useCallback(() => {
    console.log('[Overlay] Alert complete');
    window.speechSynthesis.cancel();
    setTtsFinished(true);
    lastCompletedTime.current = Date.now();
    setState(prev => ({
      ...prev,
      queue: prev.queue.map(item => 
        item.status === 'playing' ? { ...item, status: 'played' as const } : item
      ),
    }));
    lastPlayingId.current = null;
  }, []);

  // Only show alert if gate is open
  const visibleItem = state.gateOpen && playingItem ? playingItem : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}>
      <AlertDisplay 
        item={visibleItem} 
        onAlertComplete={handleAlertComplete}
        settings={overlaySettings}
      />
      
      {showDebug && (
        <div className="fixed bottom-4 left-4 text-xs text-white bg-black/80 px-3 py-2 rounded font-mono space-y-1">
          <div>WS: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>Gate: {state.gateOpen ? '🔓 OPEN' : '🔒 CLOSED'} <span className="text-gray-400">(press G)</span></div>
          <div>TTS: {ttsFinished ? '✅ Ready' : '🔊 Speaking'}</div>
          <div>Pending: {state.queue.filter(q => q.status === 'pending').length}</div>
          <div>Playing: {playingItem ? playingItem.username : 'none'} <span className="text-gray-400">(S=skip)</span></div>
          <div className="text-gray-500 text-[10px] mt-2">C=clear all pending</div>
        </div>
      )}
    </div>
  );
}
