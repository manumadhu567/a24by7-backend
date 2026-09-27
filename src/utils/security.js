import crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Hashes a plaintext password using Argon2id.
 * Argon2id is memory-hard and computationally resistant to GPU/ASIC attacks.
 * @param {string} password - Raw plaintext password
 * @returns {Promise<string>} - Encoded Argon2id hash string
 */
export const hashPassword = async (password) => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 1,
  });
};

/**
 * Verifies a plaintext password against an Argon2id hash.
 * @param {string} hash - Stored password hash
 * @param {string} password - Plaintext candidate password
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (hash, password) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

/**
 * Generates a cryptographically secure random token (64 hex characters from 32 bytes).
 * Used for email verification and password reset tokens.
 * @returns {string} - Raw random token
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Computes a SHA-256 hash of a raw token.
 * Only this hash is stored in the database, never the raw token.
 * @param {string} token - Raw token string
 * @returns {string} - Hex-encoded SHA-256 digest
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Pre-computed Argon2id hash with matching cost parameters (64MB, 3 iterations)
 * used to mitigate response-timing side channels when authenticating non-existent users.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=1,t=3$oKGNwi9w2qw3IZ7hS3xKYw$teASa75mzP9bzqRB8rFU+mL4itnT1rUC7aJfr85lzmk';

/**
 * Performs dummy password verification for non-existent users to eliminate timing discrepancies.
 * @param {string} password - Raw candidate password
 * @returns {Promise<boolean>} - Always resolves to false
 */
export const verifyDummyPassword = async (password) => {
  await verifyPassword(DUMMY_PASSWORD_HASH, password);
  return false;
};

/**
 * Session expiration constants
 */
export const SESSION_COOKIE_NAME = 'a24by7_session';
export const SESSION_DURATION_STANDARD_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_DURATION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

