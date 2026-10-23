import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { SecurityService } from '../services/securityService.js';

const router = Router();

// GET /api/users/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// PATCH /api/users/me - Update permitted profile information
router.patch('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { name, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?
  `).run(name.trim(), email ? email.trim().toLowerCase() : null, now, req.user!.id);

  const updated = db.prepare(`
    SELECT id, phone, name, email, role, status, created_at, updated_at, last_login_at
    FROM users WHERE id = ?
  `).get(req.user!.id) as any;

  return res.json({
    message: 'Profile updated successfully.',
    user: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      lastLoginAt: updated.last_login_at,
    },
  });
});

// POST /api/users/me/password - Change password
router.post('/me/password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'New passwords do not match.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
  const isMatch = await bcrypt.compare(currentPassword, userRow.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user!.id);

  SecurityService.logSecurityEvent({
    userId: req.user!.id,
    eventType: 'PASSWORD_CHANGE',
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    details: 'User password changed successfully.',
  });

  return res.json({ message: 'Password changed successfully.' });
});

// GET /api/users/me/security-events - Transparent security audit for citizen
router.get('/me/security-events', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const events = db.prepare(`
    SELECT id, event_type, ip_address, user_agent, details, created_at
    FROM security_events
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.user!.id);

  return res.json({ events });
});

export default router;
