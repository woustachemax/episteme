import { useCallback, useEffect, useRef, useState } from 'react';

export type WebSocketMessage = 
  | { type: 'status'; message: string }
  | { type: 'entity'; data: unknown }
  | { type: 'content_chunk'; chunk: string }
  | { type: 'analysis'; data: unknown }
  | { type: 'error'; message: string }
  | { type: 'complete' };

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' 
      ? 'wss:' 
      : 'ws:';
    
    const wsUrl = `${protocol}//${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setMessages(prev => [...prev, message]);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    messages,
    clearMessages
  };
}
