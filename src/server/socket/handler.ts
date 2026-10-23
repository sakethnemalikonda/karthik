import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../shared/types.js';

let io: SocketIOServer | null = null;

const JWT_SECRET = process.env.JWT_SECRET || 'smartgov_dev_jwt_key_2026_super_secure_civic_platform';

interface SocketUser {
  id: string;
  role: UserRole;
  phone: string;
}

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      // Allow anonymous connection for public tracking updates if needed
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch {
      // Invalid token, continue as anonymous
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as SocketUser | undefined;

    if (user) {
      // Join individual user room
      socket.join(`user:${user.id}`);

      // Join admin role room if authorized
      if (user.role === 'ADMIN') {
        socket.join('role:admin');
      }
    }

    // Allow tracking a specific complaint in real-time
    socket.on('track:complaint', (complaintId: string) => {
      if (complaintId) {
        socket.join(`complaint:${complaintId}`);
      }
    });

    socket.on('untrack:complaint', (complaintId: string) => {
      if (complaintId) {
        socket.leave(`complaint:${complaintId}`);
      }
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitComplaintEvent(eventType: 'complaint:created' | 'complaint:status_changed' | 'complaint:assigned', data: any) {
  if (!io) return;
  // Always notify admin room
  io.to('role:admin').emit(eventType, data);

  // Notify the citizen if citizenId is provided
  if (data.citizenId) {
    io.to(`user:${data.citizenId}`).emit(eventType, data);
  }

  // Notify listeners tracking this specific complaint
  if (data.complaintId || data.id) {
    const cid = data.complaintId || data.id;
    io.to(`complaint:${cid}`).emit(eventType, data);
  }
}
