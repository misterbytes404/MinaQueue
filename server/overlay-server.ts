/**
 * Overlay WebSocket Server
 * 
 * Runs on port 5175 and bridges communication between:
 * - Dashboard (user client) - sends commands
 * - OBS Overlay (overlay client) - receives updates and displays alerts
 * 
 * Also provides HTTP endpoints:
 * - GET /tts?voice=Brian&text=Hello - Proxy for StreamElements TTS API
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
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { PollyClient, SynthesizeSpeechCommand, Engine, OutputFormat, VoiceId } from '@aws-sdk/client-polly';
import { config } from 'dotenv';
import { info, debug, error } from '../src/lib/logger';

// Load environment variables from .env file
config();

const PORT = 5175;

// Initialize Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

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
  ttsVoice: 'default',
};

// Current state (so new overlay clients get current state)
const currentState = {
  gateOpen: true,
  queue: [] as unknown[],
  settings: { ...defaultOverlaySettings } as Record<string, unknown>,
  jwtToken: null as string | null,  // Store JWT for TTS API
};

/**
 * Handle TTS proxy requests using Amazon Polly
 */
async function handleTTSRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const voice = url.searchParams.get('voice') || 'Brian';
  const text = url.searchParams.get('text') || '';
  
  if (!text) {
    res.writeHead(400, { 'Content-Type': 'text/plain', ...corsHeaders });
    res.end('Missing text parameter');
    return;
  }
  
  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    error('[TTS Proxy] AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
    res.writeHead(500, { 'Content-Type': 'text/plain', ...corsHeaders });
    res.end('TTS not configured - missing AWS credentials');
    return;
  }
  
  try {
    info(`[TTS Proxy] Synthesizing with Polly: ${voice} - "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voice as VoiceId,
      OutputFormat: OutputFormat.MP3,
      Engine: Engine.NEURAL, // Use neural engine for better quality (falls back to standard if not available)
    });
    
    const response = await pollyClient.send(command);
    
    if (!response.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }
    
    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    info(`[TTS Proxy] Polly returned ${buffer.length} bytes`);
    
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      ...corsHeaders,
    });
    res.end(buffer);
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error('[TTS Proxy] Polly error:', errorMessage);
    
    // If neural engine not available for this voice, try standard
    if (errorMessage.includes('neural') || errorMessage.includes('Engine')) {
      try {
        info('[TTS Proxy] Retrying with standard engine...');
        const command = new SynthesizeSpeechCommand({
          Text: text,
          VoiceId: voice as VoiceId,
          OutputFormat: OutputFormat.MP3,
          Engine: Engine.STANDARD,
        });
        
        const response = await pollyClient.send(command);
        
        if (!response.AudioStream) {
          throw new Error('No audio stream returned from Polly');
        }
        
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        info(`[TTS Proxy] Polly (standard) returned ${buffer.length} bytes`);
        
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length,
          ...corsHeaders,
        });
        res.end(buffer);
        return;
      } catch (retryErr) {
        error('[TTS Proxy] Polly retry error:', retryErr);
      }
    }
    
    res.writeHead(500, { 'Content-Type': 'text/plain', ...corsHeaders });
    res.end(`TTS error: ${errorMessage}`);
  }
}

/**
 * HTTP request handler
 */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  
  // Route requests
  if (url.pathname === '/tts' && req.method === 'GET') {
    handleTTSRequest(req, res);
    return;
  }
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: clients.length }));
    return;
  }
  
  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

// Create HTTP server
const httpServer = createServer(handleRequest);

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server: httpServer });

// Start the server
httpServer.listen(PORT, () => {
  info(`[Overlay Server] HTTP server running on http://localhost:${PORT}`);
  info(`[Overlay Server] WebSocket server running on ws://localhost:${PORT}`);
  info(`[Overlay Server] TTS proxy available at http://localhost:${PORT}/tts?voice=Brian&text=Hello`);
});

wss.on('connection', (ws) => {
  const client: Client = { ws, type: 'unknown' };
  clients.push(client);
  info(`[Overlay Server] New client connected (total: ${clients.length})`);

  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', ...currentState }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Identify client type
      if (message.type === 'identify') {
        client.type = message.clientType;
        info(`[Overlay Server] Client identified as: ${client.type}`);
        
        // Note: We no longer close duplicate connections because it causes
        // reconnection loops with HMR. Multiple connections of same type are OK.
        return;
      }
      
      debug('[Overlay Server] Received:', message.type);

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
          if (message.jwtToken !== undefined) currentState.jwtToken = message.jwtToken;
          break;
        case 'token':
          // JWT token update for TTS
          currentState.jwtToken = message.jwtToken;
          info('[Overlay Server] JWT token updated:', message.jwtToken ? 'present' : 'null');
          // Broadcast token to all overlay clients
          clients.forEach((c) => {
            if (c.type === 'overlay' && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(JSON.stringify({ type: 'token', jwtToken: message.jwtToken }));
            }
          });
          break;
      }

      // Broadcast to all OTHER clients (not the sender)
      const otherClients = clients.filter(c => c.ws !== ws && c.ws.readyState === WebSocket.OPEN);
      debug(`[Overlay Server] Broadcasting ${message.type} to ${otherClients.length} other clients`);
      otherClients.forEach((c) => {
        c.ws.send(JSON.stringify(message));
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
  httpServer.close();
  process.exit(0);
});

// Clean up unknown clients after 10 seconds (they should identify immediately)
setInterval(() => {
  const unknownClients = clients.filter(c => c.type === 'unknown');
  if (unknownClients.length > 0) {
    info(`[Overlay Server] Cleaning up ${unknownClients.length} unknown clients`);
    unknownClients.forEach(c => {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.close();
      }
    });
  }
}, 10000);
