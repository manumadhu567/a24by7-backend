import mysql from 'mysql2/promise';
import { env } from './env.js';

// Configure MySQL connection pool.
const poolConfig = {
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,

  waitForConnections: true,
  connectionLimit: env.db.maxClients,
  queueLimit: 0,

  idleTimeout: env.db.idleTimeoutMillis,
  connectTimeout: env.db.connectionTimeoutMillis,

  // Keep MySQL timestamps as JavaScript Date objects.
  dateStrings: false,
};

export const pool = mysql.createPool(poolConfig);

// Pool-level error handling.
// Prevents unexpected idle connection errors from becoming unhandled.
pool.on('error', (err) => {
  console.error(
    '[DB_POOL_ERROR] Unexpected MySQL pool error:',
    err.message
  );
});

/**
 * Standard query execution helper.
 *
 * Uses parameterized queries to prevent SQL injection.
 *
 * @param {string} text - SQL statement using ? placeholders.
 * @param {Array} params - Parameter values.
 * @returns {Promise<{rows: Array, result: object}>}
 */
export const query = async (text, params = []) => {
  const start = Date.now();

  const [rows, result] = await pool.execute(text, params);

  const duration = Date.now() - start;

  if (env.isDevelopment && duration > 200) {
    console.warn(`[SLOW_QUERY] ${duration}ms: ${text}`);
  }

  return {
    rows,
    result,
  };
};

/**
 * Safe database connectivity test.
 *
 * Executes a lightweight SELECT 1 without modifying data
 * or exposing credentials.
 *
 * @returns {Promise<{
 *   connected: boolean,
 *   message: string,
 *   latencyMs?: number,
 *   errorDetails?: string
 * }>}
 */
export const testDatabaseConnection = async () => {
  const start = Date.now();

  try {
    const [rows] = await pool.execute('SELECT 1 AS alive');

    const latencyMs = Date.now() - start;

    if (rows && rows[0] && Number(rows[0].alive) === 1) {
      return {
        connected: true,
        message: 'MySQL database is connected and operational',
        latencyMs,
      };
    }

    return {
      connected: false,
      message: 'Unexpected query response from database',
      latencyMs,
    };
  } catch (err) {
    // Sanitized error report.
    // NEVER expose passwords, connection strings, or internal tokens.
    return {
      connected: false,
      message: 'MySQL connection failed or database is not reachable',
      errorDetails: err.code || 'CONNECTION_ERROR',
    };
  }
};