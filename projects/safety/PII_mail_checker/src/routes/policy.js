const express = require('express');
const router = express.Router();
const policyService = require('../services/policyService');
const auditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const policy = await policyService.getOrCreatePolicy(req.user.id);
  
  res.json({
    success: true,
    policy
  });
}));

router.put('/', authenticate, asyncHandler(async (req, res) => {
  const {
    enabledPiiTypes,
    confidenceThreshold,
    highSeverityScore,
    criticalSeverityScore,
    allowedDomains,
    allowedSenders,
    emailNotifications,
    notifyOnSeverity,
  } = req.body;

  const updates = {};
  
  if (enabledPiiTypes !== undefined) updates.enabledPiiTypes = enabledPiiTypes;
  if (confidenceThreshold !== undefined) updates.confidenceThreshold = confidenceThreshold;
  if (highSeverityScore !== undefined) updates.highSeverityScore = highSeverityScore;
  if (criticalSeverityScore !== undefined) updates.criticalSeverityScore = criticalSeverityScore;
  if (allowedDomains !== undefined) updates.allowedDomains = allowedDomains;
  if (allowedSenders !== undefined) updates.allowedSenders = allowedSenders;
  if (emailNotifications !== undefined) updates.emailNotifications = emailNotifications;
  if (notifyOnSeverity !== undefined) updates.notifyOnSeverity = notifyOnSeverity;

  const policy = await policyService.updatePolicy(req.user.id, updates);

  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.UPDATE_POLICY,
    resource: 'policy',
    resourceId: policy.id,
    details: updates,
    req,
  });

  res.json({
    success: true,
    policy
  });
}));

module.exports = router;
