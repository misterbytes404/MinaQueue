import { useEffect, useCallback, useRef, useState } from 'react';
import { AlertDisplay } from './AlertDisplay';
import type { QueueItem, OverlaySettings } from '../types';
import { useOverlayWS, type WSMessageType } from '../hooks/useOverlayWS';
import { debug, info, warn, error } from '../lib/logger';
import { playTTS, setTTSToken } from '../services/streamelements-tts';
import { playCloudTTS, STREAMELEMENTS_VOICES } from '../services/cloud-tts';

/**
 * Check if a voice ID is a cloud voice (StreamElements API)
 */
function isCloudVoice(voiceId: string): boolean {
  if (!voiceId || voiceId === 'default') return false;
  // Cloud voices are simple names like "Brian", "Amy", etc.
  return STREAMELEMENTS_VOICES.some(v => v.id === voiceId);
}

/**
 * Strip cheer emotes from message text for TTS
 * Cheer emotes follow patterns like: Cheer100, BibleThump500, Kappa1000, etc.
 */
function stripCheerEmotes(message: string): string {
  if (!message) return '';
  
  // Common cheer emote prefixes - Twitch has many variations
  // Also catches repeated patterns like "cheer100 cheer100"
  const cheerPattern = /\b(Cheer|BibleThump|cheerwhal|Corgo|uni|ShowLove|Party|SeemsGood|Pride|Kappa|FrankerZ|HeyGuys|DansGame|EleGiggle|TriHard|Kreygasm|4Head|SwiftRage|NotLikeThis|FailFish|VoHiYo|PJSalt|MrDestructoid|bday|RIPCheer|Shamrock|BitBoss|Streamlabs|Muxy|HolidayCheer|Goal|Anon)\d+\b/gi;
  
  return message
    .replace(cheerPattern, '')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
}

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
  ttsVoice: 'Brian', // Default to Brian (cloud TTS)
};

export function OverlayMode() {
  const params = new URLSearchParams(window.location.search);
  const showDebug = params.has('debug');
  const autoUnlock = params.has('unlock'); // Skip audio unlock prompt for OBS
  const voiceFromUrl = params.get('voice'); // Voice can be passed via URL
  
  const [state, setState] = useState<OverlayState>({
    queue: [],
    gateOpen: true,
  });
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(() => {
    // Try to load settings from localStorage on init
    try {
      const stored = localStorage.getItem('minaqueue-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state?.settings?.overlay) {
          info('[Overlay] Loaded settings from localStorage');
          return { ...defaultOverlaySettings, ...parsed.state.settings.overlay };
        }
      }
    } catch {
      warn('[Overlay] Failed to load settings from localStorage');
    }
    return defaultOverlaySettings;
  });
  const [volume] = useState(1);
  const [ttsFinished, setTtsFinished] = useState(true); // Track if TTS has finished
  const [audioUnlocked, setAudioUnlocked] = useState(false); // Always start false - must verify audio works
  
  // Apply voice from URL if provided (overrides stored setting)
  useEffect(() => {
    if (voiceFromUrl) {
      info('[Overlay] Using voice from URL:', voiceFromUrl);
      setOverlaySettings(prev => ({ ...prev, ttsVoice: voiceFromUrl }));
    }
  }, [voiceFromUrl]);
  
  const lastPlayingId = useRef<string | null>(null);
  const lastCompletedTime = useRef<number>(0);
  const scheduledItemId = useRef<string | null>(null); // Track which item we're scheduling
  const playedItemIds = useRef<Set<string>>(new Set()); // Track items we've already played
  const currentTTSCancel = useRef<(() => void) | null>(null); // Reference to cancel current TTS
  const DELAY_BETWEEN_ALERTS = 2000; // 2 seconds between alerts

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WSMessageType) => {
    debug('[Overlay] Received message type:', message.type);
    
    switch (message.type) {
      case 'gate':
        info('[Overlay] Gate changed to:', message.isOpen ? 'OPEN' : 'CLOSED');
        setState(prev => ({ ...prev, gateOpen: message.isOpen }));
        break;
        
      case 'queue':
        // Dashboard is source of truth for queue - just accept it
        // But preserve any 'playing' item until dashboard confirms it's 'played'
        debug('[Overlay] Received queue update:', message.queue.length, 'items');
        setState(prev => {
          const currentPlayingId = prev.queue.find(i => i.status === 'playing')?.id;
          const newQueue = message.queue.map(item => {
            // If this was our playing item and dashboard still has it as pending/playing, keep it playing
            if (item.id === currentPlayingId && item.status === 'pending') {
              return { ...item, status: 'playing' as const };
            }
            return item;
          });
          debug('[Overlay] Queue state updated, pending:', newQueue.filter(i => i.status === 'pending').length);
          return { ...prev, queue: newQueue };
        });
        break;
        
      case 'settings':
        // Merge with defaults to ensure all required properties exist
        info('[Overlay] Received settings update, ttsVoice:', message.settings.ttsVoice, 'alertImageUrl:', message.settings.alertImageUrl ? 'present (' + message.settings.alertImageUrl.length + ' chars)' : 'null');
        setOverlaySettings({ ...defaultOverlaySettings, ...message.settings });
        break;
      
      case 'token':
        // JWT token for TTS API
        info('[Overlay] Received JWT token for TTS:', message.jwtToken ? 'present' : 'null');
        setTTSToken(message.jwtToken);
        break;
        
      case 'state':
        info('[Overlay] Received initial state, settings.alertImageUrl:', message.settings?.alertImageUrl ? 'present (' + message.settings.alertImageUrl.length + ' chars)' : 'null');
        // Set JWT token for TTS API if provided
        if (message.jwtToken) {
          info('[Overlay] JWT token received for TTS');
          setTTSToken(message.jwtToken);
        }
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
        // Only update settings if we got a non-empty settings object
        if (message.settings && Object.keys(message.settings).length > 0) {
          setOverlaySettings({ ...defaultOverlaySettings, ...message.settings });
        }
        break;
        
      case 'skip':
        // Cancel StreamElements TTS playback
        if (currentTTSCancel.current) {
          currentTTSCancel.current();
          currentTTSCancel.current = null;
        }
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
      
      // Any keypress unlocks audio
      if (!audioUnlocked) {
        info('[Overlay] Audio unlocked via keyboard');
        setAudioUnlocked(true);
      }
      
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
  }, [sendGate, sendSkip, sendClear, audioUnlocked]);

  // Set transparent background for OBS
  useEffect(() => {
    document.body.classList.add('overlay-mode');
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    return () => document.body.classList.remove('overlay-mode');
  }, []);

  // Try to auto-unlock audio for OBS (attempt silent speech on load)
  useEffect(() => {
    if (autoUnlock && !audioUnlocked) {
      // Attempt to speak empty string to unlock audio context
      const synth = window.speechSynthesis;
      const silentUtterance = new SpeechSynthesisUtterance('');
      silentUtterance.volume = 0;
      silentUtterance.onend = () => {
        info('[Overlay] Audio auto-unlocked for OBS');
        setAudioUnlocked(true);
      };
      silentUtterance.onerror = (e) => {
        if (e.error === 'not-allowed') {
          warn('[Overlay] Auto-unlock failed - need user interaction. In OBS: Right-click → Interact → Click');
        }
        // Still set as "unlocked" so TTS will at least attempt to play
        // (it will fail gracefully if browser blocks it)
        setAudioUnlocked(true);
      };
      synth.speak(silentUtterance);
    }
  }, [autoUnlock, audioUnlocked]);

  // Find items
  const playingItem = state.queue.find(item => item.status === 'playing');
  const nextPendingItem = state.queue.find(item => item.status === 'pending');
  
  // Debug log queue state
  useEffect(() => {
    debug('[Overlay] Queue state:', state.queue.length, 'items -', 
      'pending:', state.queue.filter(i => i.status === 'pending').length,
      'playing:', state.queue.filter(i => i.status === 'playing').length,
      'played:', state.queue.filter(i => i.status === 'played').length);
    if (state.queue.length > 0) {
      state.queue.forEach(item => {
        debug('[Overlay] Item:', item.id, item.username, item.status);
      });
    }
  }, [state.queue]);
  
  // Auto-start next pending item when gate is open (with 2 second delay)
  useEffect(() => {
    debug('[Overlay] Auto-start check - gate:', state.gateOpen, 'playing:', playingItem?.id, 'pending:', nextPendingItem?.id, 'audioUnlocked:', audioUnlocked);
    
    // Don't do anything if gate is closed, something is playing, or nothing pending
    if (!state.gateOpen || playingItem || !nextPendingItem) {
      debug('[Overlay] Auto-start skipped - gate:', state.gateOpen, 'playing:', !!playingItem, 'pending:', !!nextPendingItem);
      return;
    }
    
    // Don't re-schedule if we already scheduled this exact item
    if (scheduledItemId.current === nextPendingItem.id) {
      return;
    }
    
    // Don't schedule items we've already played TTS for
    if (playedItemIds.current.has(nextPendingItem.id)) {
      debug('[Overlay] Skipping already-played item:', nextPendingItem.id);
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
    
    debug('[Overlay] Scheduling next alert in', delayNeeded, 'ms:', nextPendingItem.username, '(id:', nextPendingItem.id, ')');
    scheduledItemId.current = nextPendingItem.id;
    
    const timeoutId = setTimeout(() => {
      debug('[Overlay] Auto-starting:', nextPendingItem.username);
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

  // TTS - play when item starts playing (using StreamElements TTS)
  useEffect(() => {
    if (!playingItem || !state.gateOpen || !audioUnlocked) {
      return;
    }
    
    // Only play if this is a new item we haven't played before
    if (lastPlayingId.current === playingItem.id || playedItemIds.current.has(playingItem.id)) {
      return;
    }
    
    info('[Overlay] Playing TTS for:', playingItem.username);
    lastPlayingId.current = playingItem.id;
    playedItemIds.current.add(playingItem.id); // Mark as played
    
    // Cancel any previous TTS
    if (currentTTSCancel.current) {
      currentTTSCancel.current();
      currentTTSCancel.current = null;
    }
    
    if (volume > 0 && playingItem.message) {
      // Strip cheer emotes and speak only the user's actual message
      const cleanMessage = stripCheerEmotes(playingItem.message);
      debug('[Overlay] TTS message (cleaned):', cleanMessage);
      
      if (cleanMessage) {
        // Check if using cloud TTS or browser TTS
        const voice = overlaySettings.ttsVoice || 'Brian';
        const useCloud = isCloudVoice(voice);
        
        info('[Overlay] TTS Decision - overlaySettings.ttsVoice:', overlaySettings.ttsVoice, 'resolved voice:', voice, 'isCloudVoice:', useCloud);
        
        // Use appropriate TTS service
        const { promise, cancel } = useCloud 
          ? playCloudTTS(cleanMessage, voice, volume)
          : playTTS(cleanMessage, voice, volume);
        currentTTSCancel.current = cancel;
        
        promise
          .then(() => {
            debug('[Overlay] TTS finished');
            lastCompletedTime.current = Date.now();
            setTtsFinished(true);
            currentTTSCancel.current = null;
            // Notify dashboard that item has finished speaking
            if (playingItem?.id) {
              try {
                sendPlayed(playingItem.id);
              } catch (e) {
                warn('[Overlay] sendPlayed failed on TTS end', e);
              }
            }
          })
          .catch((err: Error) => {
            error('[Overlay] TTS error:', err);
            lastCompletedTime.current = Date.now();
            setTtsFinished(true);
            currentTTSCancel.current = null;
          });
      } else {
        // Message was only cheer emotes, nothing to speak
        setTtsFinished(true);
      }
    } else {
      // No message to speak, mark as finished immediately
      setTtsFinished(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingItem?.id, state.gateOpen, overlaySettings.ttsVoice, audioUnlocked]);

  // Cancel TTS when gate closes
  useEffect(() => {
    if (!state.gateOpen) {
      // Cancel StreamElements TTS
      if (currentTTSCancel.current) {
        currentTTSCancel.current();
        currentTTSCancel.current = null;
      }
      setTtsFinished(true);
    }
  }, [state.gateOpen]);

  // Mark alert complete and notify dashboard
  const handleAlertComplete = useCallback(() => {
    const currentPlaying = state.queue.find(item => item.status === 'playing');
    debug('[Overlay] Alert complete:', currentPlaying?.id);
    
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
        warn('[Overlay] sendPlayed failed on alert complete', e);
      }
    }
    
    lastPlayingId.current = null;
  }, [state.queue, sendPlayed]);

  // Handle click to unlock audio (required by browsers before speechSynthesis can work)
  const handleUnlockAudio = useCallback(() => {
    // Try to speak a silent utterance to unlock audio
    const synth = window.speechSynthesis;
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    unlockUtterance.onend = () => {
      info('[Overlay] Audio unlocked via user interaction');
      setAudioUnlocked(true);
    };
    unlockUtterance.onerror = () => {
      // Even if it errors, the click itself may have unlocked it
      info('[Overlay] Audio unlock attempted');
      setAudioUnlocked(true);
    };
    synth.speak(unlockUtterance);
  }, []);

  // Only show alert if gate is open
  const visibleItem = state.gateOpen && playingItem ? playingItem : null;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}
      onClick={!audioUnlocked ? handleUnlockAudio : undefined}
    >
      {/* Audio unlock prompt - shows until user clicks */}
      {!audioUnlocked && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-gray-900 border border-purple-500 rounded-xl p-6 text-center max-w-sm mx-4">
            <div className="text-4xl mb-4">🔊</div>
            <h2 className="text-white text-xl font-bold mb-2">Enable Audio</h2>
            <p className="text-gray-300 text-sm mb-4">
              Click anywhere to enable TTS audio playback.
            </p>
            <p className="text-gray-500 text-xs">
              For OBS: Right-click → Interact → Click here
            </p>
          </div>
        </div>
      )}
      
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
          <div>Audio: {audioUnlocked ? '🔊 Enabled' : '🔇 Click to enable'}</div>
          <div>TTS: {ttsFinished ? '✅ Ready' : '🔊 Speaking'}</div>
          <div>Voice: {overlaySettings.ttsVoice || 'default'}</div>
          <div>Pending: {state.queue.filter(q => q.status === 'pending').length}</div>
          <div>Playing: {playingItem ? playingItem.username : 'none'} <span className="text-gray-400">(S=skip)</span></div>
          <div className="text-gray-500 text-[10px] mt-2">C=clear all pending</div>
          <div className="text-yellow-500 text-[10px]">⚠️ Disable "Control audio via OBS"</div>
        </div>
      )}
    </div>
  );
}
