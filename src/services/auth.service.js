import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';

import {
  hashPassword,
  verifyPassword,
  verifyDummyPassword,
  generateSecureToken,
  hashToken,
} from '../utils/security.js';

import { createSession } from './session.service.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const registerUser = async ({
  fullName,
  email,
  phone,
  password,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      `SELECT id
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email]
    );

    if (existingUsers.length > 0) {
      const error = new Error(
        'An account could not be created with the supplied email.'
      );
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();

    await connection.execute(
      `INSERT INTO users (
        id,
        full_name,
        email,
        phone,
        password_hash,
        email_verified,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, 0, 1)`,
      [userId, fullName, email, phone, passwordHash]
    );

    const rawVerificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationTokenId = randomUUID();

    const verificationExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_TTL_MS
    );

    await connection.execute(
      `INSERT INTO email_verification_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at
      )
      VALUES (?, ?, ?, ?, NULL)`,
      [
        verificationTokenId,
        userId,
        verificationTokenHash,
        verificationExpiresAt,
      ]
    );

    await connection.commit();

    return {
      id: userId,
      fullName,
      email,
      phone,
      emailVerified: false,
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original error.
    }

    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      const conflictError = new Error(
        'An account could not be created with the supplied email.'
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw err;
  } finally {
    connection.release();
  }
};

export const authenticateUser = async ({
  email,
  password,
  rememberMe = false,
}) => {
  const [users] = await pool.execute(
    `SELECT
       id,
       full_name,
       email,
       phone,
       password_hash,
       email_verified,
       is_active,
       last_login_at
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email]
  );

  if (users.length === 0) {
    await verifyDummyPassword(password);

    const authError = new Error('Invalid email or password.');
    authError.statusCode = 401;
    throw authError;
  }

  const user = users[0];

  const isPasswordValid = await verifyPassword(
    user.password_hash,
    password
  );

  if (!isPasswordValid) {
    const authError = new Error('Invalid email or password.');
    authError.statusCode = 401;
    throw authError;
  }

  if (!Boolean(user.is_active)) {
    const inactiveError = new Error(
      'Account is deactivated. Please contact support.'
    );
    inactiveError.statusCode = 403;
    throw inactiveError;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sessionData = await createSession(
      connection,
      user.id,
      rememberMe
    );

    await connection.execute(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [user.id]
    );

    await connection.commit();

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        emailVerified: Boolean(user.email_verified),
      },

      session: {
        rawSessionToken: sessionData.rawSessionToken,
        maxAgeMs: sessionData.maxAgeMs,
        expiresAt: sessionData.expiresAt,
      },
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
