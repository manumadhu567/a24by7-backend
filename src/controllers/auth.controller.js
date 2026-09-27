import {
  validateSignupInput,
  validateSigninInput,
  validateResendVerificationInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateUpdateProfileInput,
  validateChangePasswordInput,
} from '../utils/validation.js';
import { SESSION_COOKIE_NAME } from '../utils/security.js';
import { env, isTestHookAllowed } from '../config/env.js';
import * as authService from '../services/auth.service.js';
import {
  extractSessionToken,
  getAuthenticatedUser,
  revokeSession,
} from '../services/session.service.js';
import {
  verifyEmailToken,
  resendVerificationToken,
} from '../services/emailVerification.service.js';
import {
  requestPasswordReset,
  resetPassword as executePasswordReset,
} from '../services/passwordReset.service.js';
import {
  getAccountProfile,
  updateProfile,
  changePassword as executeChangePassword,
} from '../services/account.service.js';





/**
 * Handles user registration
 * POST /api/auth/signup
 */
export const signup = async (req, res, next) => {
  try {
    // 1. Server-side validation
    const validation = validateSignupInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    // 2. Perform registration via service
    const user = await authService.registerUser(validation.data);

    // 3. Return 201 Created with safe user representation
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    // 409 Conflict for duplicate email
    if (err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: 'Account could not be created with the supplied email.',
      });
    }

    // 400 Bad Request if thrown from validation or business logic
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid request data.',
      });
    }

    // Pass all other unexpected errors to centralized errorHandler
    next(err);
  }
};

/**
 * Handles user sign in and session establishment
 * POST /api/auth/signin
 */
export const signin = async (req, res, next) => {
  try {
    // 1. Server-side validation
    const validation = validateSigninInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    // 2. Authenticate user & create secure session
    const { user, session } = await authService.authenticateUser(validation.data);

    // 3. Deliver secure session token via HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, session.rawSessionToken, {
      httpOnly: true,
      secure: env.isProduction || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: session.maxAgeMs,
    });

    // 4. Return 200 OK with sanitized user representation
    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err) {
    // 401 Unauthorized for bad credentials (generic message to prevent account enumeration)
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Invalid email or password.',
      });
    }

    // 403 Forbidden for inactive / suspended accounts
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    // 400 Bad Request for bad input data
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid request data.',
      });
    }

    // Pass all other unexpected errors to centralized errorHandler
    next(err);
  }
};

/**
 * Retrieves currently authenticated user via session cookie
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await getAuthenticatedUser(rawToken);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Authentication required.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    next(err);
  }
};

/**
 * Logs out the current user by revoking the session in DB and clearing the cookie
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const rawToken = extractSessionToken(req);
    if (rawToken) {
      await revokeSession(rawToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.isProduction || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handles email verification token confirmation
 * GET /api/auth/verify-email?token=<token>
 * POST /api/auth/verify-email { token: "..." }
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body?.token;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.',
      });
    }

    const result = await verifyEmailToken(token);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid or expired verification token.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    next(err);
  }
};

/**
 * Resends email verification token
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req, res, next) => {
  try {
    const validation = validateResendVerificationInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    const result = await resendVerificationToken(validation.data.email);

    const response = {
      success: true,
      message: result.message,
    };

    // Development/test-only hook: expose devVerificationToken strictly in non-production environments
    if (isTestHookAllowed() && req.headers['x-dev-test'] === 'true' && result.rawToken) {
      response.devVerificationToken = result.rawToken;
    }

    return res.status(200).json(response);
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid request data.',
      });
    }

    next(err);
  }
};

/**
 * Handles forgot password request
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const validation = validateForgotPasswordInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    const result = await requestPasswordReset(validation.data.email);

    const response = {
      success: true,
      message: result.message,
    };

    // Development/test-only hook: expose devResetToken strictly in non-production environments
    if (isTestHookAllowed() && req.headers['x-dev-test'] === 'true' && result.rawToken) {
      response.devResetToken = result.rawToken;
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * Handles password reset execution using confirmation token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const validation = validateResetPasswordInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    const result = await executePasswordReset({
      token: validation.data.token,
      password: validation.data.password,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid or expired password reset token.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    next(err);
  }
};

/**
 * Retrieves full authenticated user account profile
 * GET /api/auth/account
 */
export const getAccount = async (req, res, next) => {
  try {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const authUser = await getAuthenticatedUser(rawToken);
    const user = await getAccountProfile(authUser.id);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Authentication required.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: err.message || 'User not found.',
      });
    }

    next(err);
  }
};

/**
 * Updates permitted profile fields (fullName, phone) for authenticated user
 * PATCH /api/auth/account
 */
export const updateAccount = async (req, res, next) => {
  try {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const authUser = await getAuthenticatedUser(rawToken);

    const validation = validateUpdateProfileInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    const updatedUser = await updateProfile(authUser.id, validation.data);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Authentication required.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid request data.',
      });
    }

    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: err.message || 'User not found.',
      });
    }

    next(err);
  }
};

/**
 * Handles password change for authenticated user
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const authUser = await getAuthenticatedUser(rawToken);

    const validation = validateChangePasswordInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        errors: validation.errors,
      });
    }

    const result = await executeChangePassword(authUser.id, validation.data);

    // Clear session cookie since all active sessions are revoked
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.isProduction || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Authentication required.',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Account is deactivated. Please contact support.',
      });
    }

    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid request data.',
      });
    }

    if (err.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: err.message || 'User not found.',
      });
    }

    next(err);
  }
};
