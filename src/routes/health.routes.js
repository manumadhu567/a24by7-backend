import { Router } from 'express';
import { testDatabaseConnection } from '../config/database.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic service health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'A24by7 backend is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/health/db
 * @desc    MySQL database connectivity check
 * @access  Public
 */
router.get('/db', async (req, res) => {
  const result = await testDatabaseConnection();

  if (result.connected) {
    return res.status(200).json({
      success: true,
      database: 'connected',
      message: result.message,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    success: false,
    database: 'disconnected',
    message: result.message,
    details: result.errorDetails || 'Database unavailable',
    timestamp: new Date().toISOString(),
  });
});

export default router;
