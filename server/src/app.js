import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './api/routes/auth.js';
import projectRoutes from './api/routes/projects.js';
import photoRoutes from './api/routes/photos.js';
import adminRoutes from './api/routes/admin.js';
import clientRoutes from './api/routes/client.js';
import licenseRoutes from './api/routes/license.js';
import notificationRoutes from './api/routes/notifications.js';
import platformAdminRoutes from './api/routes/platformAdmin.js';
import teamRoutes from './api/routes/teams.js';
import { errorHandler } from './api/middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS (needed in dev when Vite runs on separate port; in prod, same origin)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/platform', platformAdminRoutes);
app.use('/api/teams', teamRoutes);

// API 404
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// In production, serve the built React frontend
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../dist');
  app.use(express.static(clientDist));

  // SPA fallback — any non-API route serves index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use(errorHandler);

export default app;
