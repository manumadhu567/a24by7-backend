import { pool } from '../config/database.js';

/**
 * Maintenance service for purging expired, revoked, and stale tokens and sessions.
 * Safe to execute periodically (e.g. via cron job or maintenance script).
 *
 * Guarantees:
 * - Active sessions are NEVER deleted.
 * - Active unexpired tokens are NEVER deleted.
 * - Entirely idempotent and safe to run concurrently.
 *
 * @param {object} [options]
 * @param {number} [options.retentionDays=30] - Number of days to retain consumed/revoked records for auditing
 * @returns {Promise<{ deletedSessions: number, deletedResetTokens: number, deletedVerificationTokens: number }>}
 */
export const cleanupExpiredRecords = async ({ retentionDays = 30 } = {}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Calculate retention cutoff in application code.
    const retentionCutoff = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    // 1. Purge expired sessions OR revoked sessions older than retention period
    const [sessionResult] = await connection.execute(
      `DELETE FROM sessions
       WHERE expires_at < CURRENT_TIMESTAMP(3)
          OR (
            revoked_at IS NOT NULL
            AND revoked_at < ?
          )`,
      [retentionCutoff]
    );

    // 2. Purge expired password reset tokens OR consumed tokens older than retention period
    const [resetResult] = await connection.execute(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < CURRENT_TIMESTAMP(3)
          OR (
            used_at IS NOT NULL
            AND used_at < ?
          )`,
      [retentionCutoff]
    );

    // 3. Purge expired verification tokens OR consumed tokens older than retention period
    const [verificationResult] = await connection.execute(
      `DELETE FROM email_verification_tokens
       WHERE expires_at < CURRENT_TIMESTAMP(3)
          OR (
            used_at IS NOT NULL
            AND used_at < ?
          )`,
      [retentionCutoff]
    );

    await connection.commit();

    return {
      deletedSessions: sessionResult.affectedRows || 0,
      deletedResetTokens: resetResult.affectedRows || 0,
      deletedVerificationTokens: verificationResult.affectedRows || 0,
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original error.
    }

    throw err;
  } finally {
    connection.release();
  }
};