const config = require('../config');

/**
 * Global error handler middleware
 */
function errorHandler(error, req, res, next) {
  console.error('Unhandled error:', error);

  // Prisma errors
  if (error.code?.startsWith('P')) {
    return handlePrismaError(error, res);
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    details: config.nodeEnv === 'development' ? error.stack : undefined
  });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error, res) {
  switch (error.code) {
    case 'P2002':
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        code: 'DUPLICATE_ENTRY',
        field: error.meta?.target?.[0]
      });
    
    case 'P2025':
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        code: 'NOT_FOUND'
      });
    
    case 'P2003':
      return res.status(400).json({
        success: false,
        error: 'Related record not found',
        code: 'FOREIGN_KEY_ERROR'
      });
    
    default:
      return res.status(500).json({
        success: false,
        error: 'Database error',
        code: error.code
      });
  }
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
}

/**
 * Async wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
