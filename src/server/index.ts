import express from 'express';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import { initSocket } from './socket/handler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { standardApiLimiter } from './middleware/rateLimit.js';

// Route handlers
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import complaintsRoutes from './routes/complaints.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import notificationsRoutes from './routes/notifications.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL);
const UPLOAD_DIR = process.env.UPLOAD_DIR || (isVercel ? '/tmp/uploads' : './uploads');

// Initialize WebSockets if not in serverless mode
if (!isVercel) {
  initSocket(server);
}

// Normalize rewritten Vercel URLs
app.use((req, _res, next) => {
  if (req.query && req.query.__path) {
    req.url = String(req.query.__path);
    delete req.query.__path;
  } else if (req.headers['x-matched-path']) {
    const matched = String(req.headers['x-matched-path']);
    if (matched && !matched.endsWith('index.ts') && !matched.endsWith('index.js')) {
      req.url = matched;
    }
  }
  next();
});

// Middleware
// origin: true allows credentials safely across all browsers and origins without triggering CORS errors
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Standard API rate limiting
app.use('/api', standardApiLimiter);

// Health check endpoint
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    system: 'SmartGov Connect AI',
    version: '1.0.0',
    environment: isVercel ? 'vercel-serverless' : 'standalone-node',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/api', healthHandler);

// API Routes
// Mount both with /api and without prefix so requests work regardless of Vercel rewrite prefix stripping
const apiRouteList = [
  { path: '/auth', handler: authRoutes },
  { path: '/users', handler: usersRoutes },
  { path: '/complaints', handler: complaintsRoutes },
  { path: '/admin', handler: adminRoutes },
  { path: '/ai', handler: aiRoutes },
  { path: '/notifications', handler: notificationsRoutes },
];

for (const { path: routePath, handler } of apiRouteList) {
  app.use(`/api${routePath}`, handler);
  app.use(routePath, handler);
}

// In standalone mode, serve client bundle from dist
if (!isVercel) {
  const distPath = path.resolve('dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        next();
      }
    });
  });
}

// Global error handling
app.use(errorHandler);

// Prevent unhandled errors from terminating serverless invocations
process.on('uncaughtException', (err) => {
  console.error('SERVER UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('SERVER UNHANDLED REJECTION:', reason);
});

// Start server if run directly (not in test or Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !isVercel) {
  server.listen(PORT, () => {
    console.log(`🚀 SmartGov Connect AI server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time citizen & admin events`);
  });
}

export { app, server };
export default app;
