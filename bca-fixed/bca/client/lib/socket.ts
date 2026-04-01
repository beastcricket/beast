import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

// Socket connects DIRECTLY to backend (not through Next.js proxy)
// WebSocket can't be proxied the same way as HTTP
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  // Re-create socket if disconnected so we always have a live connection
  if (!socket) {
    const token = getToken(); // read from localStorage

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports:      ['websocket', 'polling'],
      auth:            token ? { token } : {},
      reconnection:         true,
      reconnectionAttempts: 10,
      reconnectionDelay:    1500,
    });

    socket.on('connect',       () => console.log('🔌 Socket connected:', socket?.id));
    socket.on('disconnect',    (r) => console.log('❌ Socket disconnected:', r));
    socket.on('connect_error', (e) => console.warn('⚠️ Socket error:', e.message));
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
