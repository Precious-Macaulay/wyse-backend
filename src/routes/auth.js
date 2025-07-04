import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateEmail, 
  validateOTP, 
  validateSignup, 
  validateSignin 
} from '../middleware/validation.js';
import { generateUserToken } from '../utils/jwt.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email for verification
 * @access  Public
 */
router.post('/send-otp', validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    
    // Create and send OTP
    const otpDoc = await OTP.createOTP(email, 'email_verification', ipAddress, userAgent);
    await sendOTPEmail(email, otpDoc.otp, 'email_verification');

    res.status(200).json({
      message: 'OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Failed to send OTP',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for email verification
 * @access  Public
 */
router.post('/verify-otp', validateOTP, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Verify OTP
    const result = await OTP.verifyOTP(email, otp, 'email_verification');
    
    if (!result.isValid) {
      return res.status(400).json({
        error: 'Invalid OTP',
        message: result.message
      });
    }

    res.status(200).json({
      message: 'OTP verified successfully',
      email: email
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Failed to verify OTP',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/send-reset-otp
 * @desc    Send OTP to email for password reset
 * @access  Public
 */
router.post('/send-reset-otp', validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address',
        field: 'email'
      });
    }

    // Create and send reset OTP
    const otpDoc = await OTP.createOTP(email, 'password_reset', ipAddress, userAgent);
    await sendOTPEmail(email, otpDoc.otp, 'password_reset');

    res.status(200).json({
      message: 'Password reset OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Send reset OTP error:', error);
    res.status(500).json({
      error: 'Failed to send reset OTP',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/verify-reset-otp
 * @desc    Verify OTP for password reset
 * @access  Public
 */
router.post('/verify-reset-otp', validateOTP, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Verify reset OTP without marking as used
    const result = await OTP.verifyOTPWithoutMarking(email, otp, 'password_reset');
    
    if (!result.isValid) {
      return res.status(400).json({
        error: 'Invalid OTP',
        message: result.message
      });
    }

    res.status(200).json({
      message: 'Reset OTP verified successfully',
      email: email
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      error: 'Failed to verify reset OTP',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/reset-passcode
 * @desc    Reset user passcode with verified OTP
 * @access  Public
 */
router.post('/reset-passcode', [
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
  body('newPasscode')
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
], asyncHandler(async (req, res) => {
  const { email, otp, newPasscode } = req.body;

  try {
    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address',
        field: 'email'
      });
    }

    // Verify reset OTP (this will mark it as used)
    const result = await OTP.verifyOTP(email, otp, 'password_reset');
    if (!result.isValid) {
      return res.status(400).json({
        error: 'Invalid OTP',
        message: 'Invalid or expired reset code',
        field: 'otp'
      });
    }

    // Update user passcode
    user.passcode = newPasscode; // Will be hashed by pre-save middleware
    user.security.lastPasswordChange = new Date();
    await user.save();

    // Invalidate all reset OTPs for this email
    await OTP.invalidateOTPs(email, 'password_reset');

    res.status(200).json({
      message: 'Passcode reset successfully',
      email: email
    });
  } catch (error) {
    console.error('Reset passcode error:', error);
    res.status(500).json({
      error: 'Failed to reset passcode',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/signup
 * @desc    Create new user account
 * @access  Public
 */
router.post('/signup', validateSignup, asyncHandler(async (req, res) => {
  const { email, passcode } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email already exists. Please sign in instead.',
        field: 'email'
      });
    }

    // Verify that email has been verified with OTP
    const verifiedOTP = await OTP.findOne({
      email: email.toLowerCase(),
      type: 'email_verification',
      isUsed: true,
      expiresAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Within last 10 minutes
    });

    if (!verifiedOTP) {
      return res.status(400).json({
        error: 'Email verification required',
        message: 'Please verify your email with OTP before creating account',
        field: 'email'
      });
    }

    // Create new user
    const user = await User.createUser({
      email: email.toLowerCase(),
      passcode,
      isEmailVerified: true
    });

    // Generate JWT token
    const token = generateUserToken(user);

    // Send welcome email
    try {
      await sendWelcomeEmail(email, user.profile?.firstName || 'there');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the signup if welcome email fails
    }

    // Invalidate all OTPs for this email
    await OTP.invalidateOTPs(email, 'email_verification');

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        monoAccounts: user.monoAccounts || []
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email already exists. Please sign in instead.',
        field: 'email'
      });
    }

    res.status(500).json({
      error: 'Failed to create account',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in user with email and passcode
 * @access  Public
 */
router.post('/signin', validateSignin, asyncHandler(async (req, res) => {
  const { email, passcode } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or passcode',
        field: 'email'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Verify passcode
    const isPasscodeValid = await user.comparePasscode(passcode);
    if (!isPasscodeValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or passcode',
        field: 'passcode'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = generateUserToken(user);

    // Update device info
    const deviceId = `${ipAddress}-${userAgent}`.substring(0, 100);
    const existingDevice = user.security.devices.find(d => d.deviceId === deviceId);
    
    if (existingDevice) {
      existingDevice.lastUsed = new Date();
      existingDevice.ipAddress = ipAddress;
      existingDevice.userAgent = userAgent;
    } else {
      user.security.devices.push({
        deviceId,
        deviceName: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        lastUsed: new Date(),
        ipAddress,
        userAgent
      });
    }

    await user.save();

    res.status(200).json({
      message: 'Sign in successful',
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        monoAccounts: user.monoAccounts || []
      },
      token
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      error: 'Failed to sign in',
      message: 'Please try again later'
    });
  }
}));

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out user (client-side token removal)
 * @access  Private
 */
router.post('/signout', authenticateToken, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success and let the client remove the token
  
  res.status(200).json({
    message: 'Sign out successful'
  });
}));

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token and return user info
 * @access  Private
 */
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Token verified',
    user: {
      id: req.user._id,
      email: req.user.email,
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
      monoAccounts: req.user.monoAccounts || []
    }
  });
}));

export default router; 