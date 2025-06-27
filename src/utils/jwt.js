import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate JWT token for user
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'banklens-api',
    audience: 'banklens-client'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'banklens-api',
      audience: 'banklens-client'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate user token with standard payload
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateUserToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    isEmailVerified: user.isEmailVerified
  };
  
  return generateToken(payload);
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header
 * @returns {string|null} Token or null
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}; 