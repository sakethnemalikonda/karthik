import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { authRateLimiter, getClientIp } from '../middleware/rateLimit.js';
import { SecurityService } from '../services/securityService.js';
import { User, UserRole } from '../../shared/types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartgov_dev_jwt_key_2026_super_secure_civic_platform';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Normalize phone numbers (+91 default for 10-digit Indian numbers)
export function normalizePhone(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().replace(/[\s\-().]/g, '');

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Strip leading zero if 11 digits starting with 0 e.g. 09876543210 -> +919876543210
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned.slice(1)}`;
  }

  // If user entered +910XXXXXXXXXX, strip the extra 0
  cleaned = cleaned.replace(/^\+910([6-9]\d{9})$/, '+91$1');

  // If user entered double 91 e.g. +9191XXXXXXXXXX or 9191XXXXXXXXXX
  cleaned = cleaned.replace(/^\+?9191([6-9]\d{9})$/, '+91$1');

  // If 12 digits starting with 91 e.g. 919876543210
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+${cleaned}`;
  }

  // Standard 10 digit Indian number e.g. 9876543210
  if (/^[0-9]{10}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`;
  }

  return cleaned;
}

function generateToken(user: { id: string; role: UserRole; phone: string }): string {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password, confirmPassword, agreeTerms } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Full name, mobile number, and password are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!agreeTerms) {
      return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^\+[1-9]\d{9,14}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Please enter a valid mobile number with country code (e.g. +91 9876543210).' });
    }

    // Check if phone already registered
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
    if (existing) {
      return res.status(409).json({ error: 'This mobile number is already registered. Please log in instead.' });
    }

    // Check if email already registered (if provided)
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existingEmail) {
        return res.status(409).json({ error: 'This email address is already registered. Please use another email or log in.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `USR-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (id, phone, name, email, password_hash, role, status, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(userId, normalizedPhone, name.trim(), email ? email.trim().toLowerCase() : null, passwordHash, 'CITIZEN', 'ACTIVE', now, now, now);

    // Log security event
    const ip = getClientIp(req);
    SecurityService.logSecurityEvent({
      userId,
      eventType: 'REGISTRATION',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: 'Citizen registration completed successfully.',
    });

    const user: User = {
      id: userId,
      phone: normalizedPhone,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      role: 'CITIZEN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Registration successful. Welcome to SmartGov Connect AI.',
      user,
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required.' });
    }

    const normalizedPhone = normalizePhone(phone);
    const userRow = db.prepare(`
      SELECT id, phone, name, email, password_hash, role, status, created_at, updated_at, last_login_at
      FROM users WHERE phone = ?
    `).get(normalizedPhone) as any;

    const ip = getClientIp(req);

    if (!userRow) {
      SecurityService.logSecurityEvent({
        eventType: 'LOGIN_FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'] as string,
        details: `Login failure: Unregistered phone ${normalizedPhone}`,
      });
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    if (userRow.status === 'DISABLED') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact municipal administration.' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      SecurityService.logSecurityEvent({
        userId: userRow.id,
        eventType: 'LOGIN_FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'] as string,
        details: 'Login failure: Incorrect password provided.',
      });
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    // Update last login
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userRow.id);

    // Log success
    SecurityService.logSecurityEvent({
      userId: userRow.id,
      eventType: 'LOGIN_SUCCESS',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: 'User authenticated successfully.',
    });

    const user: User = {
      id: userRow.id,
      phone: userRow.phone,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role as UserRole,
      status: userRow.status,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastLoginAt: now,
    };

    const token = generateToken(user);

    return res.json({
      message: 'Login successful.',
      user,
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ message: 'Logged out successfully.' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Mobile number is required.' });
  }
  const normalizedPhone = normalizePhone(phone);
  const user = db.prepare('SELECT id, name FROM users WHERE phone = ?').get(normalizedPhone) as any;

  // For demonstration platform, return clear honest simulation response
  return res.json({
    message: user
      ? `Password reset simulation: In a live system, an OTP would be dispatched to ${normalizedPhone}. For this demo, you can log in using demo credentials or contact admin.`
      : `If this number is registered, reset instructions have been dispatched.`,
    isDemo: true,
  });
});

export default router;
