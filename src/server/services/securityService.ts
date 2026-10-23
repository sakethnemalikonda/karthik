import { db } from '../db/index.js';
import crypto from 'node:crypto';

export class SecurityService {
  public static logSecurityEvent(params: {
    userId?: string | null;
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'REGISTRATION' | 'PASSWORD_CHANGE' | 'STATUS_CHANGE';
    ipAddress?: string;
    userAgent?: string;
    details?: string;
  }) {
    const id = `SEC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_events (id, user_id, event_type, ip_address, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.userId || null,
      params.eventType,
      params.ipAddress || null,
      params.userAgent || null,
      params.details || null,
      createdAt
    );
  }
}
