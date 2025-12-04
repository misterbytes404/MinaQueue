import { useEffect, useRef, useCallback, useState } from 'react';
import { debug, info, warn, error } from '../lib/logger';
import type { QueueItem, OverlaySettings } from '../types';

const WS_URL = 'ws://localhost:5175';

export type WSMessageType = 
  | { type: 'identify'; clientType: 'dashboard' | 'overlay' }
  | { type: 'gate'; isOpen: boolean }
  | { type: 'queue'; queue: QueueItem[] }
  | { type: 'settings'; settings: OverlaySettings }
  | { type: 'skip' }
  | { type: 'clear' }
  | { type: 'play'; itemId: string }
  | { type: 'played'; itemId: string }  // Overlay tells dashboard an item finished
  | { type: 'alert'; item: QueueItem }
  | { type: 'token'; jwtToken: string | null }  // JWT token for TTS API
  | { type: 'state'; gateOpen: boolean; queue: QueueItem[]; settings: OverlaySettings; jwtToken?: string | null };

interface UseOverlayWSOptions {
  clientType: 'dashboard' | 'overlay';
  onMessage?: (message: WSMessageType) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Global singleton for WebSocket to prevent multiple connections
// Use window to survive HMR (Hot Module Replacement)
declare global {
  interface Window {
    __minaqueueWS?: Map<string, WebSocket>;
  }
}

// Initialize or reuse existing maps on window
if (!window.__minaqueueWS) {
  window.__minaqueueWS = new Map();
}

const wsInstances = window.__minaqueueWS;

export function useOverlayWS({ clientType, onMessage, onConnect, onDisconnect }: UseOverlayWSOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  // Store callbacks in refs
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onConnect, onDisconnect]);

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const attachHandlers = (ws: WebSocket) => {
      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        info(`[WS ${clientType}] Connected!`);
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'identify', clientType }));
        onConnectRef.current?.();
      };
      
      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message = JSON.parse(event.data);
          onMessageRef.current?.(message as WSMessageType);
        } catch (err) {
          error(`[WS ${clientType}] Error parsing message:`, err);
        }
      };
      
      ws.onclose = () => {
        info(`[WS ${clientType}] Disconnected`);
        wsInstances.delete(clientType);
        if (mountedRef.current) {
          setIsConnected(false);
          onDisconnectRef.current?.();
          
          // Auto-reconnect after 2 seconds
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
              warn(`[WS ${clientType}] Attempting reconnect...`);
              setupWebSocket();
            }
          }, 2000);
        }
      };
      
      ws.onerror = (err) => {
        error(`[WS ${clientType}] Error:`, err);
      };
    };
    
    const setupWebSocket = () => {
      // Check if we already have a connection for this client type
      const existingWs = wsInstances.get(clientType);
      if (existingWs && (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)) {
        debug(`[WS ${clientType}] Reusing existing connection (state: ${existingWs.readyState})`);
        // Re-attach all event handlers for HMR
        attachHandlers(existingWs);
        if (existingWs.readyState === WebSocket.OPEN) {
          setIsConnected(true);
          onConnectRef.current?.();
        }
        return existingWs;
      }
      
      // Close any existing connection that's closing or closed
      if (existingWs) {
        existingWs.close();
        wsInstances.delete(clientType);
      }
      
      info(`[WS ${clientType}] Creating new connection to ${WS_URL}`);
      const ws = new WebSocket(WS_URL);
      wsInstances.set(clientType, ws);
      attachHandlers(ws);
      
      return ws;
    };
    
    setupWebSocket();
    
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [clientType]);

  const send = useCallback((message: WSMessageType) => {
    const ws = wsInstances.get(clientType);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      warn(`[WS ${clientType}] Cannot send - not connected`);
    }
  }, [clientType]);

  const sendGate = useCallback((isOpen: boolean) => {
    send({ type: 'gate', isOpen });
  }, [send]);

  const sendQueue = useCallback((queue: QueueItem[]) => {
    send({ type: 'queue', queue });
  }, [send]);

  const sendSettings = useCallback((settings: OverlaySettings) => {
    send({ type: 'settings', settings });
  }, [send]);

  const sendSkip = useCallback(() => {
    send({ type: 'skip' });
  }, [send]);

  const sendClear = useCallback(() => {
    send({ type: 'clear' });
  }, [send]);

  const sendPlay = useCallback((itemId: string) => {
    send({ type: 'play', itemId });
  }, [send]);

  const sendPlayed = useCallback((itemId: string) => {
    send({ type: 'played', itemId });
  }, [send]);

  const sendAlert = useCallback((item: QueueItem) => {
    send({ type: 'alert', item });
  }, [send]);

  const sendState = useCallback((gateOpen: boolean, queue: QueueItem[], settings: OverlaySettings, jwtToken?: string | null) => {
    send({ type: 'state', gateOpen, queue, settings, jwtToken });
  }, [send]);

  const sendToken = useCallback((jwtToken: string | null) => {
    send({ type: 'token', jwtToken });
  }, [send]);

  const connect = useCallback(() => {
    // Placeholder for manual reconnect
  }, []);

  const disconnect = useCallback(() => {
    const ws = wsInstances.get(clientType);
    if (ws) {
      ws.close();
      wsInstances.delete(clientType);
    }
  }, [clientType]);

  return {
    isConnected,
    send,
    sendGate,
    sendQueue,
    sendSettings,
    sendSkip,
    sendClear,
    sendPlay,
    sendPlayed,
    sendAlert,
    sendState,
    sendToken,
    connect,
    disconnect,
  };
}
