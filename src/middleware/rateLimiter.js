import { env } from '../config/env.js';

/**
 * Creates an in-memory rate-limiter middleware.
 * Uses a sliding-window counter algorithm with automatic memory cleanup.
 *
 * @param {object} options
 * @param {number} [options.windowMs=900000] - Window duration in milliseconds (default: 15 minutes)
 * @param {number} [options.max=100] - Maximum requests allowed within windowMs per IP
 * @param {string} [options.message='Too many requests. Please try again later.'] - Safe response message
 * @param {function} [options.keyGenerator] - Function to determine bucket key (default: client IP)
 * @returns {import('express').RequestHandler}
 */
export const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  // In development and testing, default to a higher ceiling unless explicitly configured
  const defaultMax = (env.isDevelopment || env.isTest) ? 300 : 30;
  const max = options.max !== undefined ? options.max : defaultMax;
  const message = options.message || 'Too many requests. Please try again later.';
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection?.remoteAddress || 'unknown');

  // Key -> Array of timestamps (ms)
  const hits = new Map();

  // Periodic cleanup of stale entries (every 60s, unreferenced so it doesn't block process exit)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, validTimestamps);
      }
    }
  }, 60000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  const limiterMiddleware = (req, res, next) => {
    // Never rate-limit health check endpoints
    if (req.path.startsWith('/api/health')) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    const currentHits = hits.get(key) || [];
    // Retain only hits within the active window
    const windowHits = currentHits.filter((t) => now - t < windowMs);

    if (windowHits.length >= max) {
      const oldestHit = windowHits[0];
      const resetTimeMs = oldestHit + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTimeMs / 1000));

      return res.status(429).json({
        success: false,
        message,
      });
    }

    windowHits.push(now);
    hits.set(key, windowHits);

    const remaining = Math.max(0, max - windowHits.length);
    const resetTimeMs = windowHits[0] + windowMs;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTimeMs / 1000));

    return next();
  };

  // Diagnostic / testing helper methods
  limiterMiddleware.reset = () => hits.clear();
  limiterMiddleware.resetKey = (key) => hits.delete(key);
  limiterMiddleware.getHits = (key) => (hits.get(key) || []).length;

  return limiterMiddleware;
};

/**
 * Standard authentication rate limiter for sensitive endpoints.
 * Protects against credential stuffing, brute force, and token flooding.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (env.isDevelopment || env.isTest) ? 300 : 30, // 30 req / 15 min in prod, 300 in dev/test
  message: 'Too many authentication attempts. Please try again later.',
});
