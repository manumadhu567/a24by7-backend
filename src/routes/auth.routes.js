import { Router } from 'express';
import {
  signup,
  signin,
  getCurrentUser,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getAccount,
  updateAccount,
  changePassword,
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user account and issue verification token
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/auth/signin
 * @desc    Authenticate user credentials and establish server session
 * @access  Public
 */
router.post('/signin', signin);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve currently authenticated user profile from session cookie
 * @access  Private (Session Cookie)
 */
router.get('/me', getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke current server session and clear session cookie
 * @access  Public (Idempotent)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/verify-email
 * @route   POST /api/auth/verify-email
 * @desc    Consume email verification token and mark account verified
 * @access  Public
 */
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Issue a fresh email verification token and invalidate old unused tokens
 * @access  Public
 */
router.post('/resend-verification', resendVerification);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate password reset request and issue 24h reset token
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using confirmation token and revoke active sessions
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   GET /api/auth/account
 * @desc    Retrieve full user account profile from session cookie
 * @access  Private (Session Cookie)
 */
router.get('/account', getAccount);

/**
 * @route   PATCH /api/auth/account
 * @desc    Update permitted profile fields (fullName, phone)
 * @access  Private (Session Cookie)
 */
router.patch('/account', updateAccount);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password and revoke all active sessions
 * @access  Private (Session Cookie)
 */
router.post('/change-password', changePassword);

export default router;





