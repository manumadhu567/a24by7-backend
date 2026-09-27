import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if it exists.
// In GoDaddy production, environment variables are provided by the hosting platform.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Production safety check.
// GoDaddy Hosted Database provides DB_* variables automatically.
if (
  isProduction &&
  (!process.env.DB_HOST ||
    !process.env.DB_PORT ||
    !process.env.DB_NAME ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD)
) {
  console.error('[FATAL] Missing required MySQL database credentials in production environment.');
  process.exit(1);
}

export const env = Object.freeze({
  PORT: parseInt(process.env.PORT || '5000', 10),

  NODE_ENV,
  isProduction,
  isDevelopment: NODE_ENV === 'development',
  isTest: NODE_ENV === 'test',

  // MySQL database settings.
  // GoDaddy Hosted Database injects these automatically.
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'a24by7_dev',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',

    maxClients: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_IDLE_TIMEOUT_MS || '30000',
      10
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT_MS || '5000',
      10
    ),
  },

  // CORS settings.
  CORS_ORIGIN:
    process.env.CORS_ORIGIN || 'http://localhost:5173',
});

// Safe diagnostic summary.
// NEVER prints passwords or connection strings.
export const getSafeEnvSummary = () => ({
  PORT: env.PORT,
  NODE_ENV: env.NODE_ENV,
  CORS_ORIGIN: env.CORS_ORIGIN,

  db: {
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    hasPassword: Boolean(env.db.password),
  },
});

/**
 * Determines whether development/test-only hooks
 * are permitted.
 *
 * Production ALWAYS returns false.
 */
export const isTestHookAllowed = () => {
  const currentEnv = process.env.NODE_ENV || env.NODE_ENV;

  if (currentEnv === 'production' || env.isProduction) {
    return false;
  }

  return (
    currentEnv === 'development' ||
    currentEnv === 'test' ||
    env.isDevelopment ||
    env.isTest
  );
};