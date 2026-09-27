import { pool } from '../config/database.js';
import { generateSecureToken, hashToken } from '../utils/security.js';
import { validateVerificationTokenInput } from '../utils/validation.js';

/**
 * Consumes an email verification token atomically and marks the user email as verified.
 * Uses MySQL row-level locks (SELECT ... FOR UPDATE) inside an ACID transaction
 * to prevent race conditions or duplicate token consumption.
 *
 * @param {string} rawToken - 64-char hex verification token
 * @returns {Promise<{ success: boolean, message: string, alreadyVerified?: boolean, userId: string }>}
 */
export const verifyEmailToken = async (rawToken) => {
  if (!validateVerificationTokenInput(rawToken)) {
    const err = new Error('Invalid or expired verification token.');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = hashToken(rawToken.trim());
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock token record
    const [tokenRows] = await connection.execute(
      `SELECT
         id,
         user_id,
         expires_at,
         used_at
       FROM email_verification_tokens
       WHERE token_hash = ?
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      const err = new Error('Invalid or expired verification token.');
      err.statusCode = 400;
      throw err;
    }

    const tokenRow = tokenRows[0];

    // 2. Check if already consumed
    if (tokenRow.used_at !== null) {
      const err = new Error('Invalid or expired verification token.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Check expiration
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      const err = new Error('Invalid or expired verification token.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Lock associated user record
    const [userRows] = await connection.execute(
      `SELECT
         id,
         full_name,
         email,
         email_verified,
         is_active
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [tokenRow.user_id]
    );

    if (userRows.length === 0) {
      const err = new Error('Invalid or expired verification token.');
      err.statusCode = 400;
      throw err;
    }

    const user = userRows[0];

    // 5. Check if user account is deactivated
    if (!Boolean(user.is_active)) {
      const inactiveError = new Error(
        'Account is deactivated. Please contact support.'
      );
      inactiveError.statusCode = 403;
      throw inactiveError;
    }

    // 6. Check if email is already verified
    if (Boolean(user.email_verified)) {
      // Mark token as used to prevent replay
      await connection.execute(
        `UPDATE email_verification_tokens
         SET used_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [tokenRow.id]
      );

      await connection.commit();

      return {
        success: true,
        message: 'Email is already verified.',
        alreadyVerified: true,
        userId: user.id,
      };
    }

    // 7. Atomically verify user and mark token as used
    await connection.execute(
      `UPDATE users
       SET email_verified = 1
       WHERE id = ?`,
      [user.id]
    );

    await connection.execute(
      `UPDATE email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [tokenRow.id]
    );

    await connection.commit();

    return {
      success: true,
      message: 'Email verified successfully.',
      alreadyVerified: false,
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
 * Resends a verification token for an existing unverified account.
 * Invalidates any existing unused tokens for that user before issuing a fresh 24h token.
 * Prevents account enumeration by returning a generic safe response if user is unknown.
 *
 * @param {string} email - Normalized lowercase email
 * @returns {Promise<{ success: boolean, message: string, rawToken: string|null, userId?: string, alreadyVerified?: boolean }>}
 */
export const resendVerificationToken = async (email) => {
  // 1. Parameterized case-insensitive user lookup
  const [userRows] = await pool.execute(
    `SELECT
       id,
       full_name,
       email,
       email_verified,
       is_active
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email]
  );

  // If user does not exist, return generic response to prevent account enumeration
  if (userRows.length === 0) {
    return {
      success: true,
      message:
        'If an account exists and requires verification, a verification email can be sent.',
      rawToken: null,
    };
  }

  const user = userRows[0];

  // 2. If account is deactivated, reject safely
  if (!Boolean(user.is_active)) {
    const inactiveErr = new Error(
      'Account is deactivated. Please contact support.'
    );
    inactiveErr.statusCode = 403;
    throw inactiveErr;
  }

  // 3. If account is already verified, return safe status without issuing a new token
  if (Boolean(user.email_verified)) {
    return {
      success: true,
      message: 'Email is already verified.',
      rawToken: null,
      alreadyVerified: true,
    };
  }

  // 4. Transaction: invalidate old unused tokens and create a fresh 24h token
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Invalidate existing unused tokens for this user
    await connection.execute(
      `UPDATE email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP(3)
       WHERE user_id = ?
         AND used_at IS NULL`,
      [user.id]
    );

    // Generate new 32-byte secure token (64 hex characters)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Calculate 24-hour expiration in application code
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert new token with 24-hour expiration
    await connection.execute(
      `INSERT INTO email_verification_tokens
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
      message:
        'If an account exists and requires verification, a verification email can be sent.',
      rawToken,
      userId: user.id,
      alreadyVerified: false,
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