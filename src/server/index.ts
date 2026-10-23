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

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Standard API rate limiting
app.use('/api', standardApiLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'SmartGov Connect AI',
    version: '1.0.0',
    environment: isVercel ? 'vercel-serverless' : 'standalone-node',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationsRoutes);

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

// Start server if run directly (not in test or Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !isVercel) {
  server.listen(PORT, () => {
    console.log(`🚀 SmartGov Connect AI server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time citizen & admin events`);
  });
}

export { app, server };
export default app;
