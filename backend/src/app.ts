import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TATTI Portal Backend API', timestamp: new Date() });
});

// Mount main API
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);
