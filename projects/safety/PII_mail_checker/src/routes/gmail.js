const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');
const findingService = require('../services/findingService');
const auditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const MLPIIDetector = require('../../ml/MLPIIDetector');
const mlDetector = new MLPIIDetector();
mlDetector.initialize().catch(console.error);

router.get('/setup-status', authenticate, asyncHandler(async (req, res) => {
  const isConfigured = gmailService.isConfigured();
  const accounts = await gmailService.getGmailAccounts(req.user.id);
  
  res.json({
    success: true,
    isConfigured,
    hasConnectedAccounts: accounts.length > 0,
    accounts,
  });
}));

router.get('/auth-url', authenticate, asyncHandler(async (req, res) => {
  if (!gmailService.isConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'Gmail integration not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }
  
  const authUrl = gmailService.getAuthUrl(req.user.id);
  
  res.json({
    success: true,
    authUrl,
  });
}));

router.get('/callback', asyncHandler(async (req, res) => {
  const { code, state: userId, error } = req.query;
  
  if (error) {
    return res.redirect(`/gmail-setup?error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !userId) {
    return res.redirect('/gmail-setup?error=missing_params');
  }
  
  try {
    await gmailService.handleOAuthCallback(code, userId);
    
    await auditService.log({
      userId,
      action: auditService.AUDIT_ACTIONS.CONNECT_GMAIL,
      resource: 'gmail',
      req,
    });
    
    res.redirect('/gmail-setup?success=true');
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    res.redirect(`/gmail-setup?error=${encodeURIComponent(err.message)}`);
  }
}));

router.get('/accounts', authenticate, asyncHandler(async (req, res) => {
  const accounts = await gmailService.getGmailAccounts(req.user.id);
  
  res.json({
    success: true,
    accounts,
  });
}));

router.delete('/accounts/:id', authenticate, asyncHandler(async (req, res) => {
  await gmailService.disconnectGmailAccount(req.user.id, req.params.id);
  
  await auditService.log({
    userId: req.user.id,
    action: auditService.AUDIT_ACTIONS.DISCONNECT_GMAIL,
    resource: 'gmail',
    resourceId: req.params.id,
    req,
  });
  
  res.json({ success: true });
}));

router.post('/scan/:accountId', authenticate, asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { count = 10 } = req.body;
  
  const emails = await gmailService.scanRecentEmails(accountId, Math.min(count, 50));
  
  const results = [];
  
  for (const email of emails) {
    const mlResults = await mlDetector.detectPII(email.body || '');
    
    if (mlResults.findings.length > 0) {
      for (const finding of mlResults.findings) {
        const created = await findingService.createFinding({
          gmailAccountId: accountId,
          piiType: finding.category,
          piiCategory: finding.type || 'PII',
          description: `Detected ${finding.category} in email`,
          severity: finding.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
          riskScore: Math.round(finding.confidence * 20),
          confidence: finding.confidence,
          mlEnhanced: true,
          detectionMethod: finding.method || 'hybrid',
          value: finding.value,
          context: finding.context,
        });
        
        results.push(created);
      }
    }
  }
  
  res.json({
    success: true,
    scanned: emails.length,
    findingsCreated: results.length,
    findings: results,
  });
}));

module.exports = router;
