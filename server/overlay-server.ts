/**
 * Overlay WebSocket Server
 * 
 * Runs on port 5175 and bridges communication between:
 * - Dashboard (user client) - sends commands
 * - OBS Overlay (overlay client) - receives updates and displays alerts
 * 
 * Messages:
 * Dashboard -> Server:
 *   - { type: 'gate', isOpen: boolean }
 *   - { type: 'queue', queue: QueueItem[] }
 *   - { type: 'settings', settings: OverlaySettings }
 *   - { type: 'skip' }
 *   - { type: 'clear' }
 *   - { type: 'play', itemId: string }
 * 
 * Server -> Overlay:
 *   - All of the above, forwarded
 *   - { type: 'connected' }
 */

import { WebSocketServer, WebSocket } from 'ws';

const PORT = 5175;

interface Client {
  ws: WebSocket;
  type: 'dashboard' | 'overlay' | 'unknown';
}

const clients: Client[] = [];

// Current state (so new overlay clients get current state)
let currentState = {
  gateOpen: true,
  queue: [] as unknown[],
  settings: {} as Record<string, unknown>,
};

const wss = new WebSocketServer({ port: PORT });

console.log(`[Overlay Server] WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const client: Client = { ws, type: 'unknown' };
  clients.push(client);
  console.log('[Overlay Server] New client connected');

  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', ...currentState }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[Overlay Server] Received:', message.type);

      // Identify client type
      if (message.type === 'identify') {
        client.type = message.clientType;
        console.log(`[Overlay Server] Client identified as: ${client.type}`);
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
      console.error('[Overlay Server] Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    const index = clients.indexOf(client);
    if (index > -1) {
      clients.splice(index, 1);
    }
    console.log(`[Overlay Server] Client disconnected (${client.type})`);
  });

  ws.on('error', (err) => {
    console.error('[Overlay Server] WebSocket error:', err);
  });
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('[Overlay Server] Shutting down...');
  wss.close();
  process.exit(0);
});
