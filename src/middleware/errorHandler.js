import { env } from '../config/env.js';

/**
 * Centralized Error Handling Middleware
 * Ensures consistent JSON error responses across all endpoints.
 * Never leaks internal stack traces or database connection secrets in production.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const isProduction = env.isProduction || process.env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle body-parser payload limit exceeded (413)
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload too large.';
  }

  // Handle body-parser JSON syntax error (400)
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body.';
  }

  // In production, strictly mask internal 500 server/database errors to prevent information leakage
  if (isProduction && statusCode >= 500) {
    message = 'Internal server error.';
  }

  const response = {
    success: false,
    message,
  };

  // Include stack trace strictly in non-production environments
  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  // Log error internally in development without passwords
  if (!isProduction && env.isDevelopment) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} (${statusCode}):`, err.message);
  }

  res.status(statusCode).json(response);
};
