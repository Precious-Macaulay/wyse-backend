/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = {
      message: 'Validation failed',
      statusCode: 400,
      details: messages
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      message: `${field} already exists`,
      statusCode: 400,
      field: field
    };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = {
      message: 'Invalid ID format',
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401
    };
  }

  // Rate limiting error
  if (err.status === 429) {
    error = {
      message: 'Too many requests',
      statusCode: 429
    };
  }

  // Send error response
  res.status(error.statusCode).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async error wrapper to catch async errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
} 