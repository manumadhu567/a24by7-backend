import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRateLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security HTTP headers
// HSTS is conditionally enabled strictly in production HTTPS; never forced on localhost HTTP
app.use(
  helmet({
    hsts: (env.isProduction || process.env.NODE_ENV === 'production')
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Cross-Origin Resource Sharing (CORS) with controlled origin
// Disallows wildcard origins with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, test scripts)
      if (!origin) return callback(null, true);

      const allowedOrigins = env.CORS_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      // Match explicit configured origins; strictly never match '*' when credentials: true
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Cleanly reject unauthorized origin without throwing an unhandled 500 error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-dev-test'],
  })
);

// HTTP request logger (skip during automated test suites)
if (!env.isTest) {
  app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));
}

// Request body parsers with 50kb limit to mitigate payload-based DoS attacks
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Root route for hosting platform health checks
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'A24by7 Backend API is running',
  });
});

// Health Check Routes (unrestricted, never rate limited)
app.use('/api/health', healthRoutes);

// Authentication Routes (protected with targeted rate limiting)
app.use('/api/auth', authRateLimiter, authRoutes);


// Catch-all 404 handler for unregistered endpoints
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

export default app;
