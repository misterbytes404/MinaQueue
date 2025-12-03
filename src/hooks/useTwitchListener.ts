import { useEffect, useRef } from 'react';
import tmi from 'tmi.js';
import { useAppStore } from '../store/useAppStore';

const CHANNEL = 'cerbervt';

/**
 * Hook to listen for Twitch cheer events and add messages to the queue.
 */
export function useTwitchListener() {
  const clientRef = useRef<tmi.Client | null>(null);
  const { addItem, settings, setConnectionStatus } = useAppStore();
  const minBitsRef = useRef(settings.minBits);

  // Keep minBits ref up to date
  useEffect(() => {
    minBitsRef.current = settings.minBits;
  }, [settings.minBits]);

  useEffect(() => {
    // Create anonymous TMI client
    const client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [CHANNEL],
    });

    clientRef.current = client;

    // Connection events
    client.on('connecting', () => {
      setConnectionStatus('connecting');
    });

    client.on('connected', () => {
      setConnectionStatus('connected');
      console.log(`[Minaqueue] Connected to #${CHANNEL}`);
    });

    client.on('disconnected', () => {
      setConnectionStatus('disconnected');
      console.log('[Minaqueue] Disconnected from Twitch');
    });

    // Listen for cheer events
    client.on('cheer', (_channel, userstate, message) => {
      const bits = parseInt(userstate.bits || '0', 10);
      const username = userstate['display-name'] || userstate.username || 'Anonymous';

      console.log(`[Minaqueue] Cheer received: ${username} - ${bits} bits`);

      if (bits >= minBitsRef.current) {
        addItem({
          username,
          amount: bits,
          message: message || '',
          type: 'bits',
        });
        console.log(`[Minaqueue] Added to queue: ${username}`);
      }
    });

    // Connect
    client.connect().catch((err) => {
      console.error('[Minaqueue] Connection error:', err);
      setConnectionStatus('error');
    });

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, [addItem, setConnectionStatus]);
}
