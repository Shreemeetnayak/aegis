const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const createAnalyzeRouter = require('./routes/analyzeRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { AppError } = require('./utils/appError');

function createApp({ analyzer, cache } = {}) {
  const app = express();
  const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('This origin is not allowed to call the Aegis API.', { statusCode: 403, code: 'CORS_ORIGIN_DENIED' }));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/', rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  }));

  app.get('/', (req, res) => res.json({ name: 'Aegis', version: '1.0.0', status: 'running' }));
  app.use('/api/health', healthRoutes);
  app.use('/api/analyze', createAnalyzeRouter({ analyzer, cache }));
  app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' }));
  app.use((error, req, res, next) => {
    const known = error instanceof AppError;
    const statusCode = known ? error.statusCode : 500;
    if (!known) console.error(`[${new Date().toISOString()}] ${error.message}`);
    res.status(statusCode).json({
      success: false,
      error: known ? error.message : 'Unable to process the request right now.',
      code: known ? error.code : 'INTERNAL_ERROR',
    });
  });
  return app;
}

module.exports = { createApp };
