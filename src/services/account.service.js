import { pool } from '../config/database.js';
import { verifyPassword, hashPassword } from '../utils/security.js';

export const getAccountProfile = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       id,
       full_name,
       email,
       phone,
       email_verified,
       is_active,
       created_at,
       updated_at,
       last_login_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  if (!Boolean(user.is_active)) {
    const err = new Error('Account is deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    emailVerified: Boolean(user.email_verified),
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
};

export const updateProfile = async (userId, { fullName, phone }) => {
  const fields = [];
  const values = [];

  if (fullName !== undefined) {
    fields.push('full_name = ?');
    values.push(fullName);
  }

  if (phone !== undefined) {
    fields.push('phone = ?');
    values.push(phone);
  }

  if (fields.length === 0) {
    const err = new Error(
      'At least one field (fullName or phone) must be provided for update.'
    );
    err.statusCode = 400;
    throw err;
  }

  values.push(userId);

  const [result] = await pool.execute(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (existing.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  return getAccountProfile(userId);
};

export const changePassword = async (
  userId,
  { currentPassword, newPassword }
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows] = await connection.execute(
      `SELECT id, password_hash, is_active
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    if (userRows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = userRows[0];

    if (!Boolean(user.is_active)) {
      const err = new Error(
        'Account is deactivated. Please contact support.'
      );
      err.statusCode = 403;
      throw err;
    }

    const currentValid = await verifyPassword(
      user.password_hash,
      currentPassword
    );

    if (!currentValid) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }

    const samePassword = await verifyPassword(
      user.password_hash,
      newPassword
    );

    if (samePassword) {
      const err = new Error(
        'New password must be different from current password.'
      );
      err.statusCode = 400;
      throw err;
    }

    const newPasswordHash = await hashPassword(newPassword);

    await connection.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?`,
      [newPasswordHash, user.id]
    );

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
      message: 'Password changed successfully.',
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Preserve original error.
    }

    throw err;
  } finally {
    connection.release();
  }
};
