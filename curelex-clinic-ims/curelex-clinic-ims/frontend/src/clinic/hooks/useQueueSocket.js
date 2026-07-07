import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Use relative path - Vite will proxy to backend
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

/**
 * useQueueSocket
 * 
 * Connects to the Socket.io server and listens for live queue updates.
 * Updated for merged setup - connects to same server as backend
 */
export function useQueueSocket({ sessionToken, clinicId, doctorId, date, myToken }) {
  const socketRef = useRef(null);

  const [connected,  setConnected]  = useState(false);
  const [error,      setError]      = useState(null);
  const [queueData,  setQueueData]  = useState(null);

  const enrichQueueData = useCallback((raw, token) => {
    if (!raw) return null;

    const myRecord   = raw.patients?.find((p) => p.token === token);
    const myStatus   = myRecord ? myRecord.status : 'waiting';
    const aheadCount = (raw.patients || []).filter(
      (p) => p.status === 'waiting' && p.token < token
    ).length;

    return {
      ...raw,
      myToken:      token,
      myStatus,
      aheadCount,
      estWaitMins:  aheadCount * 5,
    };
  }, []);

  useEffect(() => {
    if (!clinicId || !doctorId || !date || !myToken) return;

    // Connect to Socket.io on the same server
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
      path: '/socket.io', // Default path
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      

      // Join the room for this specific doctor's queue
      socket.emit('join_queue', { clinicId, doctorId, date });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('❌ Clinic Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError('Connection lost. Retrying…');
      console.error('Socket error:', err.message);
    });

    socket.on('queue_update', (raw) => {
      
      setQueueData(enrichQueueData(raw, myToken));
    });

    return () => {
      socket.disconnect();
    };
  }, [clinicId, doctorId, date, myToken, enrichQueueData]);

  return { queueData, connected, error };
}