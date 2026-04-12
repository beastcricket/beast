import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

// ✅ FIXED: Use NEXT_PUBLIC_API_URL as fallback if SOCKET_URL not set
const SOCKET_URL = 
  process.env.NEXT_PUBLIC_SOCKET_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket || !socket.connected) {
    const token = getToken();
    
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id);
      console.log('🌐 Socket URL:', SOCKET_URL);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socket?.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', error.message);
      console.error('🔗 Attempted URL:', SOCKET_URL);
    });
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
