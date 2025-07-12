import { useEffect, useRef, useCallback } from 'react';
import WebSocketManager from '../utils/websocket';

/**
 * Custom hook for managing WebSocket connections in React components
 * Provides clean connection management and automatic cleanup
 */
export const useWebSocket = (url, options = {}) => {
  const wsManager = useRef(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    if (!url) return;

    // Create new WebSocket manager
    wsManager.current = new WebSocketManager(url, options);
    wsManager.current.connect();

    // Cleanup on unmount
    return () => {
      if (wsManager.current) {
        wsManager.current.close();
        wsManager.current = null;
      }
      listenersRef.current = [];
    };
  }, [url]);

  const sendMessage = useCallback((data) => {
    if (wsManager.current) {
      wsManager.current.send(data);
    }
  }, []);

  const addEventListener = useCallback((event, callback) => {
    if (wsManager.current) {
      wsManager.current.on(event, callback);
      listenersRef.current.push({ event, callback });
    }
  }, []);

  const removeEventListener = useCallback((event, callback) => {
    if (wsManager.current) {
      wsManager.current.off(event, callback);
      listenersRef.current = listenersRef.current.filter(
        listener => !(listener.event === event && listener.callback === callback)
      );
    }
  }, []);

  return {
    sendMessage,
    addEventListener,
    removeEventListener,
    isConnected: wsManager.current?.ws?.readyState === WebSocket.OPEN
  };
};