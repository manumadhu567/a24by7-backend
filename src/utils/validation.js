/**
 * Server-side Request Validation for User Registration
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * Validates the signup payload.
 * @param {object} payload - Incoming request body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object|null }}
 */
export const validateSignupInput = (payload = {}) => {
  const { fullName, email, phone, password, confirmPassword, acceptTerms } = payload;
  const errors = {};

  // 1. Full Name validation
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.trim().length < 2 || fullName.trim().length > 100) {
    errors.fullName = 'Full name must be between 2 and 100 characters.';
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (email.trim().length > 255) {
    errors.email = 'Email address cannot exceed 255 characters.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  // 3. Password validation
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one digit.';
  } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.password = 'Password must contain at least one special character.';
  }

  // 4. Confirm Password validation
  if (!confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 5. Terms acceptance validation
  if (acceptTerms !== true) {
    errors.acceptTerms = 'You must accept the Terms of Service to create an account.';
  }

  // 6. Optional Phone validation
  let normalizedPhone = null;
  if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
    const phoneStr = String(phone).trim();
    if (!PHONE_REGEX.test(phoneStr)) {
      errors.phone = 'Please provide a valid phone number (7-20 digits).';
    } else {
      normalizedPhone = phoneStr;
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: normalizedPhone,
          password,
        }
      : null,
  };
};

/**
 * Validates the signin payload.
 * @param {object} payload - Incoming signin request body
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { email: string, password: string, rememberMe: boolean }|null }}
 */
export const validateSigninInput = (payload = {}) => {
  const { email, password, rememberMe } = payload;
  const errors = {};

  // 1. Email validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  // 2. Password validation
  if (!password || typeof password !== 'string' || !password.trim()) {
    errors.password = 'Password is required.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          email: email.trim().toLowerCase(),
          password,
          rememberMe: Boolean(rememberMe),
        }
      : null,
  };
};

/**
 * Validates the email verification token format.
 * @param {string} token
 * @returns {boolean}
 */
export const validateVerificationTokenInput = (token) => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  return /^[a-fA-F0-9]{64}$/.test(trimmed);
};

/**
 * Validates resend verification request payload.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { email: string }|null }}
 */
export const validateResendVerificationInput = (payload = {}) => {
  const { email } = payload;
  const errors = {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid ? { email: email.trim().toLowerCase() } : null,
  };
};

/**
 * Validates forgot password request payload.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { email: string }|null }}
 */
export const validateForgotPasswordInput = (payload = {}) => {
  const { email } = payload;
  const errors = {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid ? { email: email.trim().toLowerCase() } : null,
  };
};

/**
 * Validates reset password request payload matching strict signup password policy.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { token: string, password: string }|null }}
 */
export const validateResetPasswordInput = (payload = {}) => {
  const { token, password, confirmPassword } = payload;
  const errors = {};

  // 1. Token validation
  if (!token || typeof token !== 'string' || !token.trim()) {
    errors.token = 'Reset token is required.';
  } else if (!/^[a-fA-F0-9]{64}$/.test(token.trim())) {
    errors.token = 'Invalid reset token format.';
  }

  // 2. Password complexity validation (matches signup complexity)
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one digit.';
  } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.password = 'Password must contain at least one special character.';
  }

  // 3. Confirm Password validation
  if (!confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          token: token.trim(),
          password,
        }
      : null,
  };
};

/**
 * Validates profile update payload.
 * Allows updating fullName and/or phone.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { fullName?: string, phone?: string|null }|null }}
 */
export const validateUpdateProfileInput = (payload = {}) => {
  const { fullName, phone } = payload;
  const errors = {};

  // Check if at least one permitted field is supplied
  if (fullName === undefined && phone === undefined) {
    errors._general = 'At least one field (fullName or phone) must be provided for update.';
  }

  // 1. Full name validation (if provided)
  if (fullName !== undefined) {
    if (typeof fullName !== 'string') {
      errors.fullName = 'Full name must be a string.';
    } else if (!fullName.trim()) {
      errors.fullName = 'Full name cannot be empty.';
    } else if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      errors.fullName = 'Full name must be between 2 and 100 characters.';
    }
  }

  // 2. Phone validation (if provided)
  let normalizedPhone = undefined;
  if (phone !== undefined) {
    if (phone === null || (typeof phone === 'string' && phone.trim() === '')) {
      normalizedPhone = null;
    } else if (typeof phone !== 'string') {
      errors.phone = 'Please provide a valid phone number (7-20 digits).';
    } else {
      const trimmedPhone = phone.trim();
      if (!PHONE_REGEX.test(trimmedPhone)) {
        errors.phone = 'Please provide a valid phone number (7-20 digits).';
      } else {
        normalizedPhone = trimmedPhone;
      }
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
          ...(phone !== undefined ? { phone: normalizedPhone } : {}),
        }
      : null,
  };
};

/**
 * Validates password change request payload.
 * Requires currentPassword and a compliant newPassword + confirmPassword.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: { currentPassword: string, newPassword: string }|null }}
 */
export const validateChangePasswordInput = (payload = {}) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const errors = {};

  // 1. Current password validation
  if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
    errors.currentPassword = 'Current password is required.';
  }

  // 2. New password complexity validation (matches signup complexity)
  if (!newPassword || typeof newPassword !== 'string') {
    errors.newPassword = 'New password is required.';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'Password must be at least 8 characters long.';
  } else if (newPassword.length > 128) {
    errors.newPassword = 'Password cannot exceed 128 characters.';
  } else if (!/[A-Z]/.test(newPassword)) {
    errors.newPassword = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(newPassword)) {
    errors.newPassword = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(newPassword)) {
    errors.newPassword = 'Password must contain at least one digit.';
  } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
    errors.newPassword = 'Password must contain at least one special character.';
  }

  // 3. Confirm Password validation
  if (!confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: isValid
      ? {
          currentPassword,
          newPassword,
        }
      : null,
  };
};




