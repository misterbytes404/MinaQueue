/**
 * StreamElements API Service
 * Handles JWT auth, Socket connection, and Alert control
 */

import { io, Socket } from 'socket.io-client';
import type { StreamElementsEvent, QueueItem } from '../types';
import { info, debug, warn } from '../lib/logger';
import { setTTSToken } from './streamelements-tts';

// StreamElements Configuration
// Get your JWT token from StreamElements dashboard: https://streamelements.com/dashboard/account/channels
const STREAMELEMENTS_SOCKET_URL = 'https://realtime.streamelements.com';

/**
 * Strip cheer emotes from message text
 * Cheer emotes follow patterns like: Cheer100, BibleThump500, Kappa1000, etc.
 * This regex matches common cheer prefixes followed by numbers
 */
function stripCheerEmotes(message: string): string {
  if (!message) return '';
  
  // Common cheer emote prefixes - Twitch has many variations
  // Pattern: word characters followed by numbers at word boundaries
  // This catches: Cheer100, BibleThump500, DansGame1000, etc.
  const cheerPattern = /\b(Cheer|BibleThump|cheerwhal|Corgo|uni|ShowLove|Party|SeemsGood|Pride|Kappa|FrankerZ|HeyGuys|DansGame|EleGiggle|TriHard|Kreygasm|4Head|SwiftRage|NotLikeThis|FailFish|VoHiYo|PJSalt|MrDestructoid|bday|RIPCheer|Shamrock|BitBoss|Streamlabs|Muxy|HolidayCheer|Goal|Anon)\d+\b/gi;
  
  return message
    .replace(cheerPattern, '')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
}

export class StreamElementsService {
  private socket: Socket | null = null;
  private onEventCallback: ((item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void) | null = null;
  private isConnecting = false;
  private lastEventId: string | null = null;  // Track last event to prevent duplicates
  private lastEventTime = 0;

  /**
   * Connect using JWT token from StreamElements dashboard
   * Users can find this at: https://streamelements.com/dashboard/account/channels
   */
  connectWithToken(
    jwtToken: string,
    onEvent: (item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void,
    onConnectionChange: (connected: boolean) => void
  ): void {
    // Prevent duplicate connections
    if (this.socket) {
      info('[StreamElements] Already connected, disconnecting old socket first');
      this.socket.removeAllListeners();  // Remove all listeners before disconnecting
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.isConnecting) {
      debug('[StreamElements] Already connecting, skipping');
      return;
    }
    
    this.isConnecting = true;
    this.onEventCallback = onEvent;

    this.socket = io(STREAMELEMENTS_SOCKET_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      info('[StreamElements] Socket connected');
      // Authenticate with JWT
      this.socket?.emit('authenticate', { method: 'jwt', token: jwtToken });
    });

    this.socket.on('authenticated', () => {
      info('[StreamElements] Authenticated successfully');
      this.isConnecting = false;
      // Set the JWT token for TTS API calls
      setTTSToken(jwtToken);
      onConnectionChange(true);
    });

    this.socket.on('disconnect', () => {
      info('[StreamElements] Socket disconnected');
      this.isConnecting = false;
      onConnectionChange(false);
    });

    this.socket.on('unauthorized', (authError: unknown) => {
      warn('[StreamElements] Authentication failed:', authError);
      this.isConnecting = false;
      onConnectionChange(false);
    });

    // Listen for real events
    this.socket.on('event', (event: StreamElementsEvent) => {
      debug('[StreamElements] Received event:', event.type, event.data?.displayName || event.data?.username);
      this.handleEvent(event);
    });

    // Listen for test events (these are separate from real events)
    this.socket.on('event:test', (event: StreamElementsEvent) => {
      debug('[StreamElements] Received TEST event:', event.type, event.data?.displayName || event.data?.username);
      this.handleEvent(event);
    });
  }

  /**
   * Handle incoming StreamElements events
   * Only processes cheer/bits events - donations and other alerts are handled by StreamElements natively
   */
  private handleEvent(event: StreamElementsEvent): void {
    if (!this.onEventCallback) return;

    // Only handle cheers (bits) - let StreamElements handle donations, subs, follows, etc.
    if (event.type === 'cheer') {
      // Create a unique event ID to prevent duplicates
      const eventId = `${event.data.username}-${event.data.amount}-${event.data.message || ''}`;
      const now = Date.now();
      
      // Ignore duplicate events within 3 seconds
      if (eventId === this.lastEventId && now - this.lastEventTime < 3000) {
        debug('[StreamElements] Ignoring duplicate event:', eventId);
        return;
      }
      
      this.lastEventId = eventId;
      this.lastEventTime = now;
      
      // Strip the cheer emotes from the message so TTS doesn't read them
      const cleanMessage = stripCheerEmotes(event.data.message || '');
      
      info('[StreamElements] Processing cheer event:', event.data.displayName || event.data.username, event.data.amount, 'bits');
      
      this.onEventCallback({
        username: event.data.displayName || event.data.username,
        amount: event.data.amount,
        message: cleanMessage,
        type: 'bits',
      });
    }
    // Tips/donations, subs, follows, etc. are ignored - StreamElements handles them
  }

  /**
   * Mute/Pause alerts via overlay control
   * Note: StreamElements uses a different approach - you control the overlay widget
   */
  async pauseAlerts(): Promise<void> {
    // StreamElements doesn't have a direct API endpoint like StreamLabs
    // Instead, you can use their activity feed widget controls
    // or send a custom event to your overlay
    if (this.socket) {
      this.socket.emit('overlay:mute', { muted: true });
    }
  }

  /**
   * Unmute/Resume alerts
   */
  async unpauseAlerts(): Promise<void> {
    if (this.socket) {
      this.socket.emit('overlay:mute', { muted: false });
    }
  }

  /**
   * Skip current alert
   */
  async skipAlert(): Promise<void> {
    if (this.socket) {
      this.socket.emit('overlay:skip');
    }
  }

  /**
   * Validate JWT token by attempting connection
   */
  async validateToken(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      const testSocket = io(STREAMELEMENTS_SOCKET_URL, {
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        testSocket.disconnect();
        resolve(false);
      }, 5000);

      testSocket.on('connect', () => {
        testSocket.emit('authenticate', { method: 'jwt', token });
      });

      testSocket.on('authenticated', () => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(true);
      });

      testSocket.on('unauthorized', () => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(false);
      });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.onEventCallback = null;
    // Clear TTS token on disconnect
    setTTSToken(null);
  }
}

// Singleton instance
export const streamElementsService = new StreamElementsService();
