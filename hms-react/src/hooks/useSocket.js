// hms-react/src/hooks/useSocket.js

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── Singleton socket — created once, lives for the app lifetime ──────────────
// Defined outside the hook so it survives component remounts.
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io('http://localhost:5000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.3,
      autoConnect: true,
    });
  }
  return socketInstance;
}

export const useSocket = () => {
  // Initialise from actual socket state so components that mount after
  // the socket is already connected get true immediately (no flicker).
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const s = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    // Sync in case socket connected between render and this effect running
    setIsConnected(s.connected);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    return () => {
      // Never disconnect — just remove this component's status listeners.
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
    };
  }, []); // empty — socket singleton never changes

  const emit = useCallback((event, data, callback) => {
    const s = getSocket();
    if (s.connected) {
      if (callback) s.emit(event, data, callback);
      else s.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event} — socket not connected`);
    }
  }, []);

  const on = useCallback((event, callback) => {
    getSocket().on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    getSocket().off(event, callback);
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off,
  };
};