import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';

import {
  generateSecureToken,
  hashToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_STANDARD_MS,
  SESSION_DURATION_REMEMBER_MS,
} from '../utils/security.js';

/**
 * Computes session duration in milliseconds.
 */
export const getSessionDurationMs = (rememberMe = false) => {
  return rememberMe
    ? SESSION_DURATION_REMEMBER_MS
    : SESSION_DURATION_STANDARD_MS;
};

/**
 * Hashes a raw session token using SHA-256 before storage.
 */
export const hashSessionToken = (token) => {
  return hashToken(token);
};

/**
 * Extracts the raw session token from the incoming request's Cookie header.
 */
export const extractSessionToken = (req) => {
  const cookieHeader = req?.headers?.cookie;

  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();

    if (key === SESSION_COOKIE_NAME) {
      const val = trimmed.slice(separatorIndex + 1).trim();

      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }

  return null;
};

/**
 * Creates a new secure server-side session inside
 * an active MySQL transaction.
 *
 * @param {object} connection - mysql2 connection with active transaction
 * @param {string} userId - UUID of authenticated user
 * @param {boolean} [rememberMe=false]
 */
export const createSession = async (
  connection,
  userId,
  rememberMe = false
) => {
  const maxAgeMs = getSessionDurationMs(rememberMe);
  const expiresAt = new Date(Date.now() + maxAgeMs);

  // Generate cryptographically secure session token.
  const rawSessionToken = generateSecureToken();

  // Store only SHA-256 hash.
  const sessionTokenHash = hashSessionToken(rawSessionToken);

  // MySQL schema uses CHAR(36), so generate UUID in Node.
  const sessionId = randomUUID();

  await connection.execute(
    `INSERT INTO sessions (
      id,
      user_id,
      session_token_hash,
      expires_at,
      created_at,
      last_used_at,
      revoked_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL)`,
    [
      sessionId,
      userId,
      sessionTokenHash,
      expiresAt,
    ]
  );

  return {
    rawSessionToken,
    sessionId,
    expiresAt,
    maxAgeMs,
  };
};

/**
 * Authenticates a session token and retrieves
 * the associated active user.
 */
export const getAuthenticatedUser = async (rawSessionToken) => {
  if (
    !rawSessionToken ||
    typeof rawSessionToken !== 'string' ||
    !rawSessionToken.trim()
  ) {
    const authError = new Error('Authentication required.');
    authError.statusCode = 401;
    throw authError;
  }

  const tokenHash = hashSessionToken(rawSessionToken.trim());

  const [records] = await pool.execute(
    `SELECT
       s.id AS session_id,
       s.user_id,
       s.expires_at,
       s.revoked_at,
       u.id AS user_id,
       u.full_name,
       u.email,
       u.phone,
       u.email_verified,
       u.is_active
     FROM sessions s
     INNER JOIN users u
       ON s.user_id = u.id
     WHERE s.session_token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  if (records.length === 0) {
    const authError = new Error('Authentication required.');
    authError.statusCode = 401;
    throw authError;
  }

  const record = records[0];

  // Reject revoked sessions.
  if (record.revoked_at !== null) {
    const authError = new Error('Authentication required.');
    authError.statusCode = 401;
    throw authError;
  }

  // Reject expired sessions.
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    const authError = new Error('Authentication required.');
    authError.statusCode = 401;
    throw authError;
  }

  // MySQL TINYINT(1) returns 0/1.
  if (!Boolean(record.is_active)) {
    await pool.execute(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [record.session_id]
    );

    const inactiveError = new Error(
      'Account is deactivated. Please contact support.'
    );
    inactiveError.statusCode = 403;
    throw inactiveError;
  }

  // Update activity timestamp for valid session.
  await pool.execute(
    `UPDATE sessions
     SET last_used_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [record.session_id]
  );

  return {
    id: record.user_id,
    fullName: record.full_name,
    email: record.email,
    phone: record.phone,
    emailVerified: Boolean(record.email_verified),
  };
};

/**
 * Revokes a session by raw session token.
 *
 * Idempotent: invalid, missing, or already-revoked sessions
 * do not cause an error.
 */
export const revokeSession = async (rawSessionToken) => {
  if (
    !rawSessionToken ||
    typeof rawSessionToken !== 'string' ||
    !rawSessionToken.trim()
  ) {
    return false;
  }

  const tokenHash = hashSessionToken(rawSessionToken.trim());

  await pool.execute(
    `UPDATE sessions
     SET revoked_at = CURRENT_TIMESTAMP(3)
     WHERE session_token_hash = ?
       AND revoked_at IS NULL`,
    [tokenHash]
  );

  return true;
};