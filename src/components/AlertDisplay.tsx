import { useEffect, useRef, useCallback, useState } from 'react';
import type { QueueItem, OverlaySettings } from '../types';

interface AlertDisplayProps {
  item: QueueItem | null;
  onAlertComplete: () => void;
  settings: OverlaySettings;
  /** If true, clicking the alert will close it (for preview mode) */
  clickToClose?: boolean;
  /** If true, wait for TTS to finish before completing */
  waitForTTS?: boolean;
  /** Signal that TTS has finished (only used when waitForTTS is true) */
  ttsFinished?: boolean;
}

type DisplayState = 'hidden' | 'visible' | 'exiting';

/**
 * OBS Browser Source Alert Display
 * Shows the current playing alert with customizable styling.
 * 
 * When waitForTTS is true, the alert will stay visible until BOTH:
 * 1. The minimum display time has elapsed
 * 2. TTS has finished (ttsFinished becomes true)
 */
export function AlertDisplay({ 
  item, 
  onAlertComplete, 
  settings, 
  clickToClose = false, 
  waitForTTS = false, 
  ttsFinished = true 
}: AlertDisplayProps) {
  const [displayState, setDisplayState] = useState<DisplayState>('hidden');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const currentItemRef = useRef<string | null>(null);
  const minTimeTimerRef = useRef<number | null>(null);
  
  const clearTimers = useCallback(() => {
    if (minTimeTimerRef.current) {
      clearTimeout(minTimeTimerRef.current);
      minTimeTimerRef.current = null;
    }
  }, []);

  // Complete the alert (start exit animation then hide)
  const completeAlert = useCallback(() => {
    console.log('[AlertDisplay] Completing alert');
    setDisplayState('exiting');
    
    // After exit animation, hide and notify parent
    setTimeout(() => {
      setDisplayState('hidden');
      currentItemRef.current = null;
      setMinTimeElapsed(false);
      onAlertComplete();
    }, 500);
  }, [onAlertComplete]);

  const handleClick = useCallback(() => {
    if (clickToClose) {
      clearTimers();
      completeAlert();
    }
  }, [clickToClose, clearTimers, completeAlert]);

  // Handle item changes - show new items
  useEffect(() => {
    // Item was removed or changed to non-playing - hide immediately
    if (!item || item.status !== 'playing') {
      clearTimers();
      if (displayState !== 'hidden') {
        setDisplayState('hidden');
        currentItemRef.current = null;
        setMinTimeElapsed(false);
      }
      return;
    }
    
    // Same item, already showing - don't restart
    if (item.id === currentItemRef.current) {
      return;
    }
    
    // New item to show
    console.log('[AlertDisplay] Showing new alert:', item.username);
    currentItemRef.current = item.id;
    clearTimers();
    setDisplayState('visible');
    setMinTimeElapsed(false);

    // Calculate minimum display time
    const minDisplayTime = settings.alertDuration;
    
    // Set timer for minimum display time
    minTimeTimerRef.current = window.setTimeout(() => {
      console.log('[AlertDisplay] Min time elapsed');
      setMinTimeElapsed(true);
    }, minDisplayTime);
    
    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.status, clearTimers, settings.alertDuration]);

  // Check if we should complete the alert
  // Complete when: min time elapsed AND (not waiting for TTS OR TTS finished)
  useEffect(() => {
    if (displayState !== 'visible') return;
    if (!minTimeElapsed) return;
    
    if (waitForTTS && !ttsFinished) {
      console.log('[AlertDisplay] Waiting for TTS to finish...');
      return;
    }
    
    console.log('[AlertDisplay] Ready to complete (minTime:', minTimeElapsed, 'ttsFinished:', ttsFinished, ')');
    completeAlert();
  }, [displayState, minTimeElapsed, waitForTTS, ttsFinished, completeAlert]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  if (displayState === 'hidden' || !item) return null;

  const isDonation = item.type === 'donation';

  return (
    <div
      className={`
        flex items-center justify-center p-8 pointer-events-none
        transition-all duration-500
        ${displayState === 'exiting' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}
      style={{ position: 'absolute', inset: 0 }}
    >
      <div
        onClick={handleClick}
        className={`
          relative max-w-lg w-full p-6 rounded-2xl shadow-2xl animate-alert-bounce
          ${clickToClose ? 'cursor-pointer pointer-events-auto hover:opacity-90' : ''}
        `}
        style={{
          backgroundColor: settings.alertBackgroundColor,
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: settings.alertBorderColor,
          boxShadow: `0 0 30px ${settings.alertBorderColor}50`,
          fontFamily: settings.fontFamily,
        }}
        title={clickToClose ? 'Click to close' : undefined}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-2xl blur-xl -z-10 opacity-30"
          style={{ backgroundColor: settings.alertBorderColor }}
        />
        
        {/* Custom Image/GIF */}
        {settings.alertImageUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={settings.alertImageUrl}
              alt="Alert"
              style={{
                width: settings.alertImageSize,
                height: 'auto',
                maxHeight: settings.alertImageSize,
                objectFit: 'contain',
              }}
              className="animate-pulse"
            />
          </div>
        )}

        {/* Username */}
        <div className="text-center mb-2">
          <h2 
            className="font-bold"
            style={{ 
              color: settings.usernameColor,
              fontSize: `${settings.fontSize * 1.25}px`,
            }}
          >
            {item.username}
          </h2>
        </div>

        {/* Amount */}
        {settings.showAmount && (
          <div className="text-center mb-4">
            <p 
              className="font-semibold"
              style={{ 
                color: settings.amountColor,
                fontSize: `${settings.fontSize}px`,
              }}
            >
              {isDonation ? `$${item.amount}` : `${item.amount} Bits`}
            </p>
          </div>
        )}

        {/* Message */}
        {settings.showMessage && item.message && (
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: `${settings.alertBackgroundColor}80` }}
          >
            <p 
              className="text-center leading-relaxed"
              style={{ 
                color: settings.messageColor,
                fontSize: `${settings.fontSize * 0.9}px`,
              }}
            >
              "{item.message}"
            </p>
          </div>
        )}

        {/* Decorative bones */}
        <div className="absolute -top-3 -left-3 text-3xl rotate-45">🦴</div>
        <div className="absolute -bottom-3 -right-3 text-3xl -rotate-45">🦴</div>
      </div>
    </div>
  );
}
