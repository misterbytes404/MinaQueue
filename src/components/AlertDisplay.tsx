import { useEffect, useRef, useCallback, useState } from 'react';
import type { QueueItem, OverlaySettings } from '../types';

interface AlertDisplayProps {
  item: QueueItem | null;
  onAlertComplete: () => void;
  settings: OverlaySettings;
  /** If true, clicking the alert will close it (for preview mode) */
  clickToClose?: boolean;
}

type DisplayState = 'hidden' | 'visible' | 'exiting';

/**
 * OBS Browser Source Alert Display
 * Shows the current playing alert with customizable styling
 */
export function AlertDisplay({ item, onAlertComplete, settings, clickToClose = false }: AlertDisplayProps) {
  const [displayState, setDisplayState] = useState<DisplayState>('hidden');
  const currentItemRef = useRef<string | null>(null);
  const timersRef = useRef<{ exit?: number; complete?: number }>({});
  
  const clearTimers = useCallback(() => {
    if (timersRef.current.exit) {
      clearTimeout(timersRef.current.exit);
      timersRef.current.exit = undefined;
    }
    if (timersRef.current.complete) {
      clearTimeout(timersRef.current.complete);
      timersRef.current.complete = undefined;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (clickToClose) {
      clearTimers();
      setDisplayState('hidden');
      currentItemRef.current = null;
      onAlertComplete();
    }
  }, [clickToClose, clearTimers, onAlertComplete]);

  // Handle item changes
  useEffect(() => {
    // Item was removed or changed to non-playing - hide immediately
    if (!item || item.status !== 'playing') {
      clearTimers();
      setDisplayState('hidden');
      currentItemRef.current = null;
      return;
    }
    
    // Same item, already showing - don't restart
    if (item.id === currentItemRef.current) {
      return;
    }
    
    // New item to show
    currentItemRef.current = item.id;
    clearTimers();
    setDisplayState('visible');

    // Use configured duration, add extra time for longer messages
    const messageBonus = item.message ? Math.min(item.message.length * 50, 5000) : 0;
    const displayTime = settings.alertDuration + messageBonus;

    // Start exit animation before completing
    timersRef.current.exit = window.setTimeout(() => {
      setDisplayState('exiting');
    }, displayTime - 500);

    // Complete alert
    timersRef.current.complete = window.setTimeout(() => {
      setDisplayState('hidden');
      currentItemRef.current = null;
      onAlertComplete();
    }, displayTime);
    
    return clearTimers;
  }, [item?.id, item?.status, onAlertComplete, clearTimers, settings.alertDuration]);

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
