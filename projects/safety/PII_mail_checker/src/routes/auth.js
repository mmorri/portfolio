const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const auditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  const existingUser = await userService.findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists'
    });
  }

  const user = await userService.createUser({ email, password, name });
  
  req.session.userId = user.id;
  
  await auditService.log({
    userId: user.id,
    action: auditService.AUDIT_ACTIONS.CREATE_USER,
    resource: 'user',
    resourceId: user.id,
    req,
  });

  res.status(201).json({
    success: true,
    user
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  const user = await userService.findUserByEmail(email);
  
  if (!user || !user.isActive) {
    await auditService.log({
      action: auditService.AUDIT_ACTIONS.LOGIN_FAILED,
      details: { email, reason: 'user_not_found' },
      req,
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const validPassword = await userService.validatePassword(user, password);
  
  if (!validPassword) {
    await auditService.log({
      userId: user.id,
      action: auditService.AUDIT_ACTIONS.LOGIN_FAILED,
      details: { reason: 'invalid_password' },
      req,
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  req.session.userId = user.id;
  await userService.updateLastLogin(user.id);
  
  await auditService.log({
    userId: user.id,
    action: auditService.AUDIT_ACTIONS.LOGIN,
    req,
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.LOGOUT,
    req,
  });

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await userService.findUserById(req.user.id);
  res.json({
    success: true,
    user
  });
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  
  const user = await userService.updateUser(req.user.id, { name, password });
  
  res.json({
    success: true,
    user
  });
}));

module.exports = router;
