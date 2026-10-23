import { db } from '../db/index.js';
import crypto from 'node:crypto';

export class AuditService {
  public static logAction(params: {
    adminId: string;
    adminName: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    ipAddress?: string;
  }) {
    const id = `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const changesJson = params.changes ? JSON.stringify(params.changes) : null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, action, entity_type, entity_id, changes_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.adminId,
      params.adminName,
      params.action,
      params.entityType,
      params.entityId,
      changesJson,
      params.ipAddress || null,
      createdAt
    );
  }
}
