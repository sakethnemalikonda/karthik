import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, RateLimitStore>>();

export function getClientIp(req: any): string {
  try {
    const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
    if (typeof forwarded === 'string' && forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return String(forwarded[0]).trim();
    }
    if (req.socket?.remoteAddress) {
      return String(req.socket.remoteAddress);
    }
    if (req.connection?.remoteAddress) {
      return String(req.connection.remoteAddress);
    }
    return '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const storeId = `${options.windowMs}_${options.max}`;
  if (!stores.has(storeId)) {
    stores.set(storeId, new Map());
  }
  const clientStore = stores.get(storeId)!;

  return (req: Request, res: Response, next: NextFunction) => {
    // In test environment, skip rate limits
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const entry = clientStore.get(ip);

    if (!entry || now > entry.resetTime) {
      clientStore.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (entry.count >= options.max) {
      const retrySec = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retrySec);
      return res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retrySec,
      });
    }

    entry.count++;
    next();
  };
}

// 15-minute window, max 30 attempts for auth endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

// Standard API limiter
export const standardApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: 'API rate limit exceeded. Please throttle requests.',
});
