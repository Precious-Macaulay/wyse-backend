import { body, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errorMessages
    });
  }
  
  next();
};

/**
 * Validation rules for email
 */
export const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  handleValidationErrors
];

/**
 * Validation rules for OTP
 */
export const validateOTP = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  handleValidationErrors
];

/**
 * Validation rules for passcode
 */
export const validatePasscode = [
  body('passcode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Passcode must be exactly 6 digits')
    .isNumeric()
    .withMessage('Passcode must contain only numbers')
    .custom((value) => {
      // Check if all digits are the same
      if (new Set(value).size === 1) {
        throw new Error('Passcode cannot be all the same digit');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation rules for signup
 */
export const validateSignup = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('passcode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Passcode must be exactly 6 digits')
    .isNumeric()
    .withMessage('Passcode must contain only numbers')
    .custom((value) => {
      // Check if all digits are the same
      if (new Set(value).size === 1) {
        throw new Error('Passcode cannot be all the same digit');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation rules for signin
 */
export const validateSignin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('passcode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Passcode must be exactly 6 digits')
    .isNumeric()
    .withMessage('Passcode must contain only numbers'),
  handleValidationErrors
];

/**
 * Validation rules for user profile update
 */
export const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid date of birth'),
  handleValidationErrors
];

/**
 * Validation rules for preferences update
 */
export const validatePreferencesUpdate = [
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean value'),
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean value'),
  body('preferences.notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean value'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  body('preferences.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  handleValidationErrors
]; 