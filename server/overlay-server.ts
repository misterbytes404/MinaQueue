/**
 * Overlay WebSocket Server
 * 
 * Runs on port 5175 and bridges communication between:
 * - Dashboard (user client) - sends commands
 * - OBS Overlay (overlay client) - receives updates and displays alerts
 * 
 * Messages:
 * Dashboard -> Server -> Overlay:
 *   - { type: 'gate', isOpen: boolean }
 *   - { type: 'queue', queue: QueueItem[] }
 *   - { type: 'settings', settings: OverlaySettings }
 *   - { type: 'skip' }
 *   - { type: 'clear' }
 *   - { type: 'play', itemId: string }
 * 
 * Overlay -> Server -> Dashboard:
 *   - { type: 'played', itemId: string } - Alert finished playing
 * 
 * Server -> New Client:
 *   - { type: 'state', gateOpen, queue, settings }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { info, debug, error } from '../src/lib/logger';

const PORT = 5175;

interface Client {
  ws: WebSocket;
  type: 'dashboard' | 'overlay' | 'unknown';
}

const clients: Client[] = [];

// Default overlay settings (same as in OverlayMode.tsx)
const defaultOverlaySettings = {
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

// Current state (so new overlay clients get current state)
const currentState = {
  gateOpen: true,
  queue: [] as unknown[],
  settings: { ...defaultOverlaySettings } as Record<string, unknown>,
};

const wss = new WebSocketServer({ port: PORT });

info(`[Overlay Server] WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const client: Client = { ws, type: 'unknown' };
  clients.push(client);
  info('[Overlay Server] New client connected');

  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', ...currentState }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      debug('[Overlay Server] Received:', message.type);

      // Identify client type
        if (message.type === 'identify') {
          client.type = message.clientType;
          info(`[Overlay Server] Client identified as: ${client.type}`);
          return;
        }

      // Update state based on message
      switch (message.type) {
        case 'gate':
          currentState.gateOpen = message.isOpen;
          break;
        case 'queue':
          currentState.queue = message.queue;
          break;
        case 'settings':
          currentState.settings = message.settings;
          debug('[Overlay Server] Settings updated, alertImageUrl:', message.settings.alertImageUrl ? 'present (' + message.settings.alertImageUrl.length + ' chars)' : 'null');
          break;
        case 'state':
          // Full state update
          if (typeof message.gateOpen === 'boolean') currentState.gateOpen = message.gateOpen;
          if (message.queue) currentState.queue = message.queue;
          if (message.settings) currentState.settings = message.settings;
          break;
      }

      // Broadcast to all overlay clients
      clients.forEach((c) => {
        if (c.ws !== ws && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      error('[Overlay Server] Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    const index = clients.indexOf(client);
    if (index > -1) {
      clients.splice(index, 1);
    }
    info(`[Overlay Server] Client disconnected (${client.type})`);
  });

  ws.on('error', (err) => {
    error('[Overlay Server] WebSocket error:', err);
  });
});

// Keep process alive
process.on('SIGINT', () => {
  info('[Overlay Server] Shutting down...');
  wss.close();
  process.exit(0);
});
