import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { User, UserRole } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smartgov_dev_jwt_key_2026_super_secure_civic_platform';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
    const stmt = db.prepare('SELECT id, phone, name, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?');
    const userRow = stmt.get(payload.id) as any;

    if (!userRow) {
      return res.status(401).json({ error: 'User record not found or session revoked.' });
    }

    if (userRow.status === 'DISABLED') {
      return res.status(403).json({ error: 'This account has been disabled by municipal administration.' });
    }

    req.user = {
      id: userRow.id,
      phone: userRow.phone,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role as UserRole,
      status: userRow.status,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastLoginAt: userRow.last_login_at,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }
  next();
}

export function requireCitizen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'CITIZEN') {
    return res.status(403).json({ error: 'Access denied. Citizen account required.' });
  }
  next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
    const stmt = db.prepare('SELECT id, phone, name, email, role, status, created_at, updated_at, last_login_at FROM users WHERE id = ?');
    const userRow = stmt.get(payload.id) as any;
    if (userRow && userRow.status === 'ACTIVE') {
      req.user = {
        id: userRow.id,
        phone: userRow.phone,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role as UserRole,
        status: userRow.status,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
        lastLoginAt: userRow.last_login_at,
      };
    }
  } catch {
    // Ignore invalid optional token
  }

  next();
}
