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
  const scheduledItemId = useRef<string | null>(null); // Track which item we're scheduling
  const playedItemIds = useRef<Set<string>>(new Set()); // Track items we've already played
  const DELAY_BETWEEN_ALERTS = 2000; // 2 seconds between alerts

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WSMessageType) => {
    console.log('[Overlay] Received:', message.type);
    
    switch (message.type) {
      case 'gate':
        setState(prev => ({ ...prev, gateOpen: message.isOpen }));
        break;
        
      case 'queue':
        // Dashboard is source of truth for queue - just accept it
        // But preserve any 'playing' item until dashboard confirms it's 'played'
        setState(prev => {
          const currentPlayingId = prev.queue.find(i => i.status === 'playing')?.id;
          const newQueue = message.queue.map(item => {
            // If this was our playing item and dashboard still has it as pending/playing, keep it playing
            if (item.id === currentPlayingId && item.status === 'pending') {
              return { ...item, status: 'playing' as const };
            }
            return item;
          });
          return { ...prev, queue: newQueue };
        });
        break;
        
      case 'settings':
        setOverlaySettings(message.settings);
        break;
        
      case 'state':
        setState(prev => {
          const currentPlayingId = prev.queue.find(i => i.status === 'playing')?.id;
          const newQueue = message.queue.map(item => {
            if (item.id === currentPlayingId && item.status === 'pending') {
              return { ...item, status: 'playing' as const };
            }
            return item;
          });
          return { 
            ...prev, 
            gateOpen: message.gateOpen,
            queue: newQueue,
          };
        });
        if (message.settings) {
          setOverlaySettings(message.settings);
        }
        break;
        
      case 'skip':
        window.speechSynthesis.cancel();
        setTtsFinished(true);
        lastCompletedTime.current = Date.now();
        scheduledItemId.current = null;
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

  const { isConnected, sendGate, sendSkip, sendClear, sendPlayed } = useOverlayWS({
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
    // Don't do anything if gate is closed, something is playing, or nothing pending
    if (!state.gateOpen || playingItem || !nextPendingItem) {
      return;
    }
    
    // Don't re-schedule if we already scheduled this exact item
    if (scheduledItemId.current === nextPendingItem.id) {
      return;
    }
    
    // Don't schedule items we've already played TTS for
    if (playedItemIds.current.has(nextPendingItem.id)) {
      console.log('[Overlay] Skipping already-played item:', nextPendingItem.id);
      // Mark it as played in local state
      setState(prev => ({
        ...prev,
        queue: prev.queue.map(item => 
          item.id === nextPendingItem.id ? { ...item, status: 'played' as const } : item
        ),
      }));
      sendPlayed(nextPendingItem.id);
      return;
    }
    
    // Calculate delay
    const timeSinceLastCompleted = Date.now() - lastCompletedTime.current;
    const delayNeeded = lastCompletedTime.current === 0 
      ? 100  // No delay for first alert
      : Math.max(100, DELAY_BETWEEN_ALERTS - timeSinceLastCompleted);
    
    console.log('[Overlay] Scheduling next alert in', delayNeeded, 'ms:', nextPendingItem.username, '(id:', nextPendingItem.id, ')');
    scheduledItemId.current = nextPendingItem.id;
    
    const timeoutId = setTimeout(() => {
      console.log('[Overlay] Auto-starting:', nextPendingItem.username);
      setTtsFinished(false);
      setState(prev => ({
        ...prev,
        queue: prev.queue.map(item => 
          item.id === nextPendingItem.id ? { ...item, status: 'playing' as const } : item
        ),
      }));
    }, delayNeeded);
    
    return () => {
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gateOpen, playingItem?.id, nextPendingItem?.id, sendPlayed]);

  // TTS - play when item starts playing
  useEffect(() => {
    if (!playingItem || !state.gateOpen) {
      return;
    }
    
    // Only play if this is a new item we haven't played before
    if (lastPlayingId.current === playingItem.id || playedItemIds.current.has(playingItem.id)) {
      return;
    }
    
    console.log('[Overlay] Playing TTS for:', playingItem.username);
    lastPlayingId.current = playingItem.id;
    playedItemIds.current.add(playingItem.id); // Mark as played
    
    const synth = window.speechSynthesis;
    synth.cancel(); // Cancel any previous speech
    
    if (volume > 0 && playingItem.message) {
      // Speak only the message body. Do NOT read the username or the amounts (cheers/bits).
      const utterance = new SpeechSynthesisUtterance(
        `${playingItem.message}`
      );
      utterance.volume = volume;
      
      // Mark TTS as finished when it completes — record completion time
      utterance.onend = () => {
        console.log('[Overlay] TTS finished');
        // Record actual TTS completion time to enforce post-TTS delay
        lastCompletedTime.current = Date.now();
        setTtsFinished(true);
        // Notify dashboard immediately that item has finished speaking
        if (playingItem?.id) {
          try {
            sendPlayed(playingItem.id);
          } catch (e) {
            console.warn('[Overlay] sendPlayed failed on utterance end', e);
          }
        }
      };
      
      utterance.onerror = () => {
        console.log('[Overlay] TTS error');
        lastCompletedTime.current = Date.now();
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

  // Mark alert complete and notify dashboard
  const handleAlertComplete = useCallback(() => {
    const currentPlaying = state.queue.find(item => item.status === 'playing');
    console.log('[Overlay] Alert complete:', currentPlaying?.id);
    
    // Do NOT cancel speech here — TTS should have finished already.
    setTtsFinished(true);
    scheduledItemId.current = null;
    
    if (currentPlaying) {
      // Mark locally and notify dashboard (might be redundant if we already sent on utterance end)
      setState(prev => ({
        ...prev,
        queue: prev.queue.map(item => 
          item.id === currentPlaying.id ? { ...item, status: 'played' as const } : item
        ),
      }));
      try {
        sendPlayed(currentPlaying.id);
      } catch (e) {
        console.warn('[Overlay] sendPlayed failed on alert complete', e);
      }
    }
    
    lastPlayingId.current = null;
  }, [state.queue, sendPlayed]);

  // Only show alert if gate is open
  const visibleItem = state.gateOpen && playingItem ? playingItem : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}>
      <AlertDisplay 
        item={visibleItem} 
        onAlertComplete={handleAlertComplete}
        settings={overlaySettings}
        waitForTTS={true}
        ttsFinished={ttsFinished}
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
