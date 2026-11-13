import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/auth.routes.js';
import tradeRoutes from './routes/trade.routes.js';
import adminRoutes from './routes/admin.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import optionRoutes from './routes/option.routes.js';
import presetRoutes from './routes/preset.routes.js';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching origins
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === clientUrl) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local development convenience
      }
    },
    credentials: true,
  }));

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for uploaded screenshots
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Rate Limiter for Auth Routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth requests from this IP, please try again after 15 minutes' },
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Trading Journal API',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/trades', tradeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/options', optionRoutes);
  app.use('/api/presets', presetRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Resource not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  });

  return app;
};
