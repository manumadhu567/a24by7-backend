import app from './app.js';
import { env, getSafeEnvSummary } from './config/env.js';
import { testDatabaseConnection, pool } from './config/database.js';

const startServer = async () => {
  console.log('====================================================');
  console.log('  A24by7 Backend API — Foundation Phase 2');
  console.log('====================================================');
  console.log('[CONFIG] Runtime Environment:', JSON.stringify(getSafeEnvSummary(), null, 2));

  // Safe database connectivity check on startup
  console.log('[DB] Testing MySQL connectivity...');
  const dbCheck = await testDatabaseConnection();

  if (dbCheck.connected) {
    console.log(`[DB] MySQL connected successfully (${dbCheck.latencyMs}ms latency).`);
  } else {
    console.warn('[DB] MySQL status: NOT AVAILABLE LOCALLY');
    console.warn('[DB] Backend code and database connection layer: CREATED');
    console.warn('[DB] Database connectivity test: PENDING MySQL setup');
  }

  // Start HTTP listener
  const server = app.listen(env.PORT, () => {
    console.log(`[SERVER] A24by7 Backend running at http://localhost:${env.PORT}`);
    console.log(`[SERVER] Health check available at: http://localhost:${env.PORT}/api/health`);
    console.log(`[SERVER] DB Health check available at: http://localhost:${env.PORT}/api/health/db`);
    console.log('====================================================');
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully closing HTTP server and database pool...`);
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed.');
      try {
        await pool.end();
        console.log('[SHUTDOWN] MySQL pool drained.');
      } catch (err) {
        console.error('[SHUTDOWN] Error closing MySQL pool:', err.message);
      }
      process.exit(0);
    });

    // Force shutdown if cleanup takes too long
    setTimeout(() => {
      console.error('[SHUTDOWN] Forceful termination timeout reached.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('[FATAL] Failed to initialize A24by7 backend server:', err.message);
  process.exit(1);
});
