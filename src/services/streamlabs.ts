/**
 * StreamLabs API Service
 * Handles OAuth, Socket connection, and Alert Queue control
 */

import { io, Socket } from 'socket.io-client';
import type { StreamLabsEvent, QueueItem } from '../types';
import { info } from '../lib/logger';

// StreamLabs OAuth Configuration
// You'll need to register an app at https://dev.streamlabs.com/
const STREAMLABS_CLIENT_ID = import.meta.env.VITE_STREAMLABS_CLIENT_ID || '';
const STREAMLABS_REDIRECT_URI = import.meta.env.VITE_STREAMLABS_REDIRECT_URI || 'http://localhost:5173/auth/streamlabs';
const STREAMLABS_API_BASE = 'https://streamlabs.com/api/v2.0';

/**
 * Strip cheer emotes from message text
 * Cheer emotes follow patterns like: Cheer100, BibleThump500, Kappa1000, etc.
 */
function stripCheerEmotes(message: string): string {
  if (!message) return '';
  
  // Common cheer emote prefixes - Twitch has many variations
  const cheerPattern = /\b(Cheer|BibleThump|cheerwhal|Corgo|uni|ShowLove|Party|SeemsGood|Pride|Kappa|FrankerZ|HeyGuys|DansGame|EleGiggle|TriHard|Kreygasm|4Head|SwiftRage|NotLikeThis|FailFish|VoHiYo|PJSalt|MrDestructoid|bday|RIPCheer|Shamrock|BitBoss|Streamlabs|Muxy|HolidayCheer|Goal|Anon)\d+\b/gi;
  
  return message
    .replace(cheerPattern, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class StreamLabsService {
  private socket: Socket | null = null;
  private accessToken: string | null = null;
  private onEventCallback: ((item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void) | null = null;

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: STREAMLABS_CLIENT_ID,
      redirect_uri: STREAMLABS_REDIRECT_URI,
      response_type: 'code',
      scope: 'donations.read alerts.create alerts.write socket.token',
    });
    return `https://streamlabs.com/api/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; socketToken: string }> {
    // In production, this should go through your backend to keep client_secret secure
    const response = await fetch(`${STREAMLABS_API_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: STREAMLABS_CLIENT_ID,
        client_secret: import.meta.env.VITE_STREAMLABS_CLIENT_SECRET || '',
        redirect_uri: STREAMLABS_REDIRECT_URI,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;

    // Get socket token
    const socketToken = await this.getSocketToken(data.access_token);

    return {
      accessToken: data.access_token,
      socketToken,
    };
  }

  /**
   * Get socket token for real-time events
   */
  async getSocketToken(accessToken: string): Promise<string> {
    const response = await fetch(`${STREAMLABS_API_BASE}/socket/token`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get socket token');
    }

    const data = await response.json();
    return data.socket_token;
  }

  /**
   * Connect to StreamLabs socket for real-time events
   */
  connectSocket(
    socketToken: string,
    onEvent: (item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void,
    onConnectionChange: (connected: boolean) => void
  ): void {
    this.onEventCallback = onEvent;

    this.socket = io(`https://sockets.streamlabs.com?token=${socketToken}`, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      info('[StreamLabs] Socket connected');
      onConnectionChange(true);
    });

    this.socket.on('disconnect', () => {
      info('[StreamLabs] Socket disconnected');
      onConnectionChange(false);
    });

    this.socket.on('event', (event: StreamLabsEvent) => {
      this.handleEvent(event);
    });
  }

  /**
   * Handle incoming StreamLabs events
   */
  private handleEvent(event: StreamLabsEvent): void {
    if (!this.onEventCallback) return;

    // Handle bits and donations
    if (event.type === 'bits' || event.type === 'donation') {
      for (const msg of event.message) {
        const amount = typeof msg.amount === 'string' ? parseFloat(msg.amount) : msg.amount;
        
        // For bits, strip the cheer emotes from the message so TTS doesn't read them
        const cleanMessage = event.type === 'bits'
          ? stripCheerEmotes(msg.message || '')
          : (msg.message || '');
        
        this.onEventCallback({
          username: msg.name,
          amount: amount,
          message: cleanMessage,
          type: event.type === 'bits' ? 'bits' : 'donation',
        });
      }
    }
  }

  /**
   * Pause the StreamLabs alert queue
   */
  async pauseQueue(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${STREAMLABS_API_BASE}/alerts/pause_queue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to pause queue');
    }
  }

  /**
   * Unpause the StreamLabs alert queue
   */
  async unpauseQueue(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${STREAMLABS_API_BASE}/alerts/unpause_queue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unpause queue');
    }
  }

  /**
   * Skip the current alert
   */
  async skipAlert(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${STREAMLABS_API_BASE}/alerts/skip`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to skip alert');
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string): Promise<{ username: string }> {
    const response = await fetch(`${STREAMLABS_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();
    return { username: data.streamlabs?.display_name || data.twitch?.display_name || 'Unknown' };
  }

  /**
   * Set access token (for restoring session)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.accessToken = null;
    this.onEventCallback = null;
  }
}

// Singleton instance
export const streamLabsService = new StreamLabsService();
