import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pool } from './database/pgPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors({ origin: true, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check with read-only database connectivity test
app.get('/health', async (_req, res) => {
  let isDbConnected = false;
  try {
    await pool.query('SELECT 1');
    isDbConnected = true;
  } catch (err: any) {
    // Log real failure reason to server logs only; do not expose internal details to client
    console.error('[HealthCheck] Database connection check failed:', err.message);
  }

  const statusCode = isDbConnected ? 200 : 503;
  return res.status(statusCode).json({
    status: isDbConnected ? 'ok' : 'error',
    service: 'PSY CARE Portal Backend API',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date(),
  });
});

// Mount main API
app.use('/api', apiRouter);

// Serve frontend static assets if available (supports single-service deployment)
const possibleDistPaths = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../public'),
];
const staticPath = possibleDistPaths.find(p => fs.existsSync(p));

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

