import { db } from '../db/index.js';
import { Notification } from '../../shared/types.js';
import { getSocketIO } from '../socket/handler.js';
import crypto from 'node:crypto';

export class NotificationService {
  /**
   * Create a notification record and emit real-time event to the user
   */
  public static createNotification(params: {
    userId: string;
    complaintId?: string | null;
    title: string;
    message: string;
    type: 'STATUS_UPDATE' | 'ASSIGNMENT' | 'DUPLICATE_FLAG' | 'RESOLVED' | 'GENERAL';
    link?: string | null;
  }): Notification {
    const id = `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO notifications (id, user_id, complaint_id, title, message, type, read, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      params.userId,
      params.complaintId || null,
      params.title,
      params.message,
      params.type,
      params.link || null,
      createdAt
    );

    const notification: Notification = {
      id,
      userId: params.userId,
      complaintId: params.complaintId,
      title: params.title,
      message: params.message,
      type: params.type,
      read: false,
      link: params.link,
      createdAt,
    };

    // Emit real-time WebSocket event via Socket.IO if connected
    try {
      const io = getSocketIO();
      if (io) {
        io.to(`user:${params.userId}`).emit('notification:new', notification);
      }
    } catch {
      // Sockets might not be initialized yet in tests/seeds
    }

    return notification;
  }

  /**
   * Get unread count for user
   */
  public static getUnreadCount(userId: string): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
    `);
    const res = stmt.get(userId) as { count: number } | undefined;
    return res ? res.count : 0;
  }
}
