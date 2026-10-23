import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';

  // Avoid leaking sensitive trace in production responses
  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
  });
}
