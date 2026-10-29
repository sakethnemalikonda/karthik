import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { normalizePhone } from '../src/server/routes/auth.js';
import { app } from '../src/server/index.js';
import { EventEmitter } from 'node:events';

function mockAppRequest(options: { method: string; url: string; body: any }): Promise<{ status: number; body: any }> {
  const req: any = new EventEmitter();
  req.method = options.method;
  req.url = options.url;
  req.headers = {
    'content-type': 'application/json',
    'user-agent': 'test-agent',
    'x-forwarded-for': '127.0.0.1',
  };
  req.body = options.body;
  req.ip = '127.0.0.1';
  req.socket = { remoteAddress: '127.0.0.1' };
  req.connection = { remoteAddress: '127.0.0.1' };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = new EventEmitter();
  res.setHeader = () => res;
  res.getHeader = () => undefined;
  res.status = (code: number) => {
    statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    responseData = data;
    res.emit('finish');
    return res;
  };
  res.send = (data: any) => {
    try {
      responseData = JSON.parse(data);
    } catch {
      responseData = data;
    }
    res.emit('finish');
    return res;
  };
  res.end = () => {
    res.emit('finish');
    return res;
  };

  return new Promise((resolve) => {
    res.on('finish', () => {
      resolve({ status: statusCode, body: responseData });
    });
    app(req, res);
  });
}

describe('Authentication & Security', () => {
  it('hashes passwords securely and verifies them', async () => {
    const rawPassword = 'SecretPassword@123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await bcrypt.compare('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('signs and verifies JWT tokens with role claims', () => {
    const secret = 'test_jwt_secret_key_12345';
    const payload = {
      id: 'USR-TEST-001',
      role: 'ADMIN',
      phone: '+919876543210',
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, secret) as typeof payload;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.phone).toBe(payload.phone);
  });

  it('rejects tampered or forged JWT tokens', () => {
    const secret = 'test_jwt_secret_key_12345';
    const fakeSecret = 'tampered_secret_key_99999';
    const token = jwt.sign({ id: 'USR-001', role: 'ADMIN' }, secret);

    expect(() => {
      jwt.verify(token, fakeSecret);
    }).toThrow();
  });

  it('normalizes various mobile number formats accurately', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('+919876543210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+9109876543210')).toBe('+919876543210');
    expect(normalizePhone('+91919876543210')).toBe('+919876543210');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567');
  });

  it('registers a new citizen successfully via POST /api/auth/register', async () => {
    const uniquePhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    const res = await mockAppRequest({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: 'Aarav Patel',
        phone: uniquePhone,
        email: `aarav.${Date.now()}@example.com`,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        agreeTerms: true,
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Registration successful');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('CITIZEN');
    expect(res.body.user.status).toBe('ACTIVE');
    expect(res.body.token).toBeDefined();

    // Verify token decodes properly
    const decoded = jwt.decode(res.body.token) as any;
    expect(decoded.id).toBe(res.body.user.id);
    expect(decoded.role).toBe('CITIZEN');
  });

  it('rejects registration with duplicate mobile number', async () => {
    const res = await mockAppRequest({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: 'Duplicate Attempt',
        phone: '+919876543210', // Already registered Admin phone
        email: 'dup@example.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        agreeTerms: true,
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already registered');
  });

  it('rejects registration when passwords do not match', async () => {
    const res = await mockAppRequest({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: 'Mismatch User',
        phone: '+919811223344',
        password: 'Password@123',
        confirmPassword: 'DifferentPassword@123',
        agreeTerms: true,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('do not match');
  });

  it('rejects registration when terms are not agreed', async () => {
    const res = await mockAppRequest({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        name: 'No Terms User',
        phone: '+919811223344',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        agreeTerms: false,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('agree to the Terms');
  });
});
