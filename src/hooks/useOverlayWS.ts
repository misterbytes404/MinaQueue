import { useEffect, useRef, useCallback, useState } from 'react';
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
  | { type: 'state'; gateOpen: boolean; queue: QueueItem[]; settings: OverlaySettings };

interface UseOverlayWSOptions {
  clientType: 'dashboard' | 'overlay';
  onMessage?: (message: WSMessageType) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useOverlayWS({ clientType, onMessage, onConnect, onDisconnect }: UseOverlayWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onConnect, onDisconnect]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log(`[WS ${clientType}] Connecting to ${WS_URL}...`);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS ${clientType}] Connected!`);
      setIsConnected(true);
      // Identify ourselves
      ws.send(JSON.stringify({ type: 'identify', clientType }));
      onConnectRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessageType;
        onMessageRef.current?.(message);
      } catch (err) {
        console.error(`[WS ${clientType}] Error parsing message:`, err);
      }
    };

    ws.onclose = () => {
      console.log(`[WS ${clientType}] Disconnected`);
      setIsConnected(false);
      wsRef.current = null;
      onDisconnectRef.current?.();

      // Auto-reconnect after 2 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log(`[WS ${clientType}] Attempting reconnect...`);
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          const newWs = new WebSocket(WS_URL);
          wsRef.current = newWs;
          setupWebSocket(newWs);
        }
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error(`[WS ${clientType}] Error:`, err);
    };
    
    function setupWebSocket(socket: WebSocket) {
      socket.onopen = ws.onopen;
      socket.onmessage = ws.onmessage;
      socket.onclose = ws.onclose;
      socket.onerror = ws.onerror;
    }
  }, [clientType]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: WSMessageType) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn(`[WS ${clientType}] Cannot send - not connected`);
    }
  }, [clientType]);

  // Convenience methods
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

  const sendState = useCallback((gateOpen: boolean, queue: QueueItem[], settings: OverlaySettings) => {
    send({ type: 'state', gateOpen, queue, settings });
  }, [send]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

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
    connect,
    disconnect,
  };
}
