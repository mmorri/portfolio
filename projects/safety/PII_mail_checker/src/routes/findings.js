const express = require('express');
const router = express.Router();
const findingService = require('../services/findingService');
const auditService = require('../services/auditService');
const { authenticate, analystOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { 
    status, 
    severity, 
    piiType, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 20,
    gmailAccountId
  } = req.query;

  const result = await findingService.getFindings({
    gmailAccountId,
    status,
    severity,
    piiType,
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

router.get('/statistics', authenticate, asyncHandler(async (req, res) => {
  const { gmailAccountId, days = 7 } = req.query;
  
  const statistics = await findingService.getStatistics(
    gmailAccountId, 
    parseInt(days, 10)
  );

  res.json({
    success: true,
    statistics
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const finding = await findingService.getFindingById(req.params.id);
  
  if (!finding) {
    return res.status(404).json({
      success: false,
      error: 'Finding not found'
    });
  }

  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.VIEW_FINDING,
    resource: 'finding',
    resourceId: finding.id,
    req,
  });

  res.json({
    success: true,
    finding
  });
}));

router.patch('/:id/status', authenticate, analystOrAdmin, asyncHandler(async (req, res) => {
  const { status, reviewNotes, falsePositive } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Status is required'
    });
  }

  const finding = await findingService.updateFindingStatus(req.params.id, {
    status,
    reviewedById: req.user.id,
    reviewNotes,
    falsePositive,
  });

  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.UPDATE_FINDING,
    resource: 'finding',
    resourceId: finding.id,
    details: { status, falsePositive },
    req,
  });

  res.json({
    success: true,
    finding
  });
}));

router.post('/bulk-update', authenticate, analystOrAdmin, asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  
  if (!ids || !Array.isArray(ids) || !status) {
    return res.status(400).json({
      success: false,
      error: 'ids array and status are required'
    });
  }

  const result = await findingService.bulkUpdateFindings(ids, {
    status,
    reviewedById: req.user.id,
  });

  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.UPDATE_FINDING,
    resource: 'finding',
    details: { ids, status, count: result.count },
    req,
  });

  res.json({
    success: true,
    updated: result.count
  });
}));

router.post('/:id/feedback', authenticate, asyncHandler(async (req, res) => {
  const { isCorrect, correctType, notes } = req.body;
  
  if (isCorrect === undefined) {
    return res.status(400).json({
      success: false,
      error: 'isCorrect is required'
    });
  }

  const feedback = await findingService.addFeedback(req.params.id, {
    isCorrect,
    correctType,
    notes,
    createdById: req.user.id,
  });

  res.status(201).json({
    success: true,
    feedback
  });
}));

module.exports = router;
