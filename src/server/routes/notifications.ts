import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const rows = db.prepare(`
    SELECT id, user_id, complaint_id, title, message, type, read, link, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId) as any[];

  const notifications = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    complaintId: r.complaint_id,
    title: r.title,
    message: r.message,
    type: r.type,
    read: Boolean(r.read),
    link: r.link,
    createdAt: r.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.id;

  const result = db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
  `).run(id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  return res.json({ message: 'Marked as read.' });
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  db.prepare(`
    UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0
  `).run(userId);

  return res.json({ message: 'All notifications marked as read.' });
});

export default router;
