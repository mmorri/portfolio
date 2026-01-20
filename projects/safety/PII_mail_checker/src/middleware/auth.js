const { getPrismaClient } = require('../config/database');

/**
 * Authentication middleware - validates session
 */
async function authenticate(req, res, next) {
  try {
    // Check session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const prisma = getPrismaClient();
    
    // Get user from session
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Optional authentication - continues even if not authenticated
 */
async function optionalAuth(req, res, next) {
  try {
    if (req.session && req.session.userId) {
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without user
    next();
  }
}

/**
 * Role-based authorization
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * Admin only middleware
 */
const adminOnly = authorize('ADMIN');

/**
 * Analyst or Admin middleware
 */
const analystOrAdmin = authorize('ADMIN', 'ANALYST');

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  analystOrAdmin,
};
