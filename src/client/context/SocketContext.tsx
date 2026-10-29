import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';
import { getAuthToken } from '../lib/api.js';
import { Notification } from '../../shared/types.js';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  trackComplaint: (complaintId: string) => void;
  untrackComplaint: (complaintId: string) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const token = getAuthToken();
    const newSocket = io({
      auth: { token: token || undefined },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', () => {
      setConnected(false);
    });

    // Real-time notification handler
    newSocket.on('notification:new', (notification: Notification) => {
      toast({
        type: notification.type === 'RESOLVED' ? 'success' : 'ai',
        title: notification.title,
        message: notification.message,
      });

      // Dispatch event to trigger refetching of notification list
      window.dispatchEvent(new CustomEvent('notification:received', { detail: notification }));
    });

    // Complaint status update handler
    newSocket.on('complaint:status_changed', (data: any) => {
      window.dispatchEvent(new CustomEvent('complaint:updated', { detail: data }));
    });

    newSocket.on('complaint:created', (data: any) => {
      window.dispatchEvent(new CustomEvent('complaint:new', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const trackComplaint = (complaintId: string) => {
    if (socket && connected && complaintId) {
      socket.emit('track:complaint', complaintId);
    }
  };

  const untrackComplaint = (complaintId: string) => {
    if (socket && connected && complaintId) {
      socket.emit('untrack:complaint', complaintId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, trackComplaint, untrackComplaint }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
