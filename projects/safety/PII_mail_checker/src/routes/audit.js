const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const { authenticate, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { 
    userId, 
    action, 
    resource,
    startDate, 
    endDate, 
    page = 1, 
    limit = 50 
  } = req.query;

  const result = await auditService.getAuditLogs({
    userId,
    action,
    resource,
    startDate,
    endDate,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.json({
    success: true,
    ...result
  });
}));

router.get('/actions', authenticate, (req, res) => {
  res.json({
    success: true,
    actions: Object.keys(auditService.AUDIT_ACTIONS)
  });
}));

module.exports = router;
