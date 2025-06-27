import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Middleware to authenticate user via JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-passcode');
    
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to require email verification
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
  }
  next();
};

/**
 * Middleware to get user info without requiring authentication
 * Useful for optional user context
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-passcode');
      
      if (user && !user.isLocked) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to check if user is admin (for future use)
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }
  next();
}; 