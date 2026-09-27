import crypto from 'crypto';
import { pool } from '../config/database.js';
import {
  generateSecureToken,
  hashToken,
  hashPassword,
} from '../utils/security.js';

/**
 * Initiates a password reset request for a user.
 * Prevents account enumeration by returning the identical safe generic message
 * whether the account exists, does not exist, or is inactive.
 * For active existing accounts, atomically invalidates prior unused reset tokens
 * and inserts a fresh 24h cryptographically secure token hash.
 *
 * @param {string} email - Normalized lowercase email
 * @returns {Promise<{ success: boolean, message: string, rawToken: string|null, userId?: string }>}
 */
export const requestPasswordReset = async (email) => {
  // 1. Parameterized case-insensitive lookup
  const [userRows] = await pool.execute(
    `SELECT
       id,
       full_name,
       email,
       is_active
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email]
  );

  const GENERIC_RESPONSE = {
    success: true,
    message:
      'If an account exists for this email, password reset instructions will be sent.',
    rawToken: null,
  };

  // 2. Account enumeration protection: non-existent account
  if (userRows.length === 0) {
    return GENERIC_RESPONSE;
  }

  const user = userRows[0];

  // 3. Account enumeration protection: deactivated account
  if (!Boolean(user.is_active)) {
    return GENERIC_RESPONSE;
  }

  // 4. Atomic transaction: invalidate old unused tokens & create fresh 24h token
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Invalidate existing unused reset tokens for this user
    await connection.execute(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP(3)
       WHERE user_id = ?
         AND used_at IS NULL`,
      [user.id]
    );

    // Generate 32-byte secure token (64 hex characters)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Calculate 24-hour expiration in application code
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store token hash with 24-hour expiration
    await connection.execute(
      `INSERT INTO password_reset_tokens
       (id, user_id, token_hash, expires_at, created_at, used_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), NULL)`,
      [
        crypto.randomUUID(),
        user.id,
        tokenHash,
        expiresAt,
      ]
    );

    await connection.commit();

    return {
      success: true,
      message: GENERIC_RESPONSE.message,
      rawToken,
      userId: user.id,
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

/**
 * Resets user password atomically using a valid unexpired reset token.
 * Uses MySQL row-level locks (SELECT ... FOR UPDATE) inside an ACID transaction
 * to guarantee token single-use, prevent replay/race conditions, update Argon2id hash,
 * and immediately revoke all existing active sessions.
 *
 * @param {object} params
 * @param {string} params.token - Raw 64-char hex reset token
 * @param {string} params.password - Validated plaintext new password
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resetPassword = async ({ token, password }) => {
  const tokenHash = hashToken(token.trim());
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Locate and lock reset-token row
    const [tokenRows] = await connection.execute(
      `SELECT
         id,
         user_id,
         expires_at,
         used_at
       FROM password_reset_tokens
       WHERE token_hash = ?
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      const err = new Error(
        'Invalid or expired password reset token.'
      );
      err.statusCode = 400;
      throw err;
    }

    const tokenRow = tokenRows[0];

    // 2. Check if already consumed
    if (tokenRow.used_at !== null) {
      const err = new Error(
        'Invalid or expired password reset token.'
      );
      err.statusCode = 400;
      throw err;
    }

    // 3. Check expiration
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      const err = new Error(
        'Invalid or expired password reset token.'
      );
      err.statusCode = 400;
      throw err;
    }

    // 4. Locate and lock user record
    const [userRows] = await connection.execute(
      `SELECT
         id,
         email,
         is_active
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [tokenRow.user_id]
    );

    if (userRows.length === 0) {
      const err = new Error(
        'Invalid or expired password reset token.'
      );
      err.statusCode = 400;
      throw err;
    }

    const user = userRows[0];

    // 5. Check if user account is deactivated
    if (!Boolean(user.is_active)) {
      const inactiveErr = new Error(
        'Account is deactivated. Please contact support.'
      );
      inactiveErr.statusCode = 403;
      throw inactiveErr;
    }

    // 6. Hash new password using Argon2id
    const newPasswordHash = await hashPassword(password);

    // 7. Update user password_hash
    await connection.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?`,
      [newPasswordHash, user.id]
    );

    // 8. Mark reset token as used
    await connection.execute(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [tokenRow.id]
    );

    // 9. Revoke ALL active sessions for this user
    await connection.execute(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP(3)
       WHERE user_id = ?
         AND revoked_at IS NULL`,
      [user.id]
    );

    await connection.commit();

    return {
      success: true,
      message: 'Password has been reset successfully.',
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