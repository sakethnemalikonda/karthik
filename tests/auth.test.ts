import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
});
