import express from 'express';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

import { getDb } from './server/db.js';
import { initWebSocket } from './server/websocket.js';
import authRouter from './server/routes/auth.js';
import employeesRouter from './server/routes/employees.js';
import attendanceRouter from './server/routes/attendance.js';
import leaveRouter from './server/routes/leave.js';
import payrollRouter from './server/routes/payroll.js';
import analyticsRouter from './server/routes/analytics.js';
import documentsRouter from './server/routes/documents.js';
import notificationsRouter from './server/routes/notifications.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  await getDb();

  // Basic Middlewares
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Dayflow HRMS API',
      timestamp: new Date().toISOString(),
      database: 'SQLite (persisted)'
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/leave', leaveRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/notifications', notificationsRouter);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // Initialize WebSockets
  initWebSocket(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dayflow HRMS] Production server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Dayflow Server] Startup error:', err);
  process.exit(1);
});
