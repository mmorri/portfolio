const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('./config');
const { connectDatabase, getPrismaClient } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const findingsRoutes = require('./routes/findings');
const policyRoutes = require('./routes/policy');
const auditRoutes = require('./routes/audit');
const gmailRoutes = require('./routes/gmail');

const MLPIIDetector = require('../ml/MLPIIDetector');

const app = express();

app.use(express.json());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.sessionMaxAge,
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  }
}));

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: config.rateLimitPoints,
  duration: config.rateLimitDuration,
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }
});

const mlDetector = new MLPIIDetector();
let mlEnabled = false;

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mlEnabled,
    uptime: process.uptime(),
    version: require('../package.json').version,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/findings', findingsRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/gmail', gmailRoutes);

app.get('/api/ml/status', (req, res) => {
  res.json({
    success: true,
    mlEnabled,
    stats: mlDetector.getStats(),
  });
});

app.post('/api/ml/test', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required'
    });
  }
  
  const result = await mlDetector.detectPII(text);
  res.json({
    success: true,
    result
  });
});

app.post('/api/analyze-email', async (req, res) => {
  const { from, subject, body, to } = req.body;
  
  if (!from || !subject) {
    return res.status(400).json({
      success: false,
      error: 'From and subject are required fields'
    });
  }

  const mlResults = await mlDetector.detectPII(body || '');
  
  let riskScore = mlResults.confidence * 10;
  const findings = mlResults.findings.map(f => ({
    ...f,
    method: f.method || 'ml-enhanced',
  }));

  const riskLevel = riskScore >= 20 ? 'CRITICAL' :
                   riskScore >= 10 ? 'HIGH' :
                   riskScore >= 5 ? 'MEDIUM' : 'LOW';

  res.json({
    success: true,
    result: {
      from,
      to: Array.isArray(to) ? to : [to].filter(Boolean),
      subject,
      riskLevel,
      riskScore,
      findings,
      requiresReview: riskScore >= 5,
      mlEnhanced: mlEnabled,
      mlConfidence: mlResults.confidence,
      processingTime: mlResults.processingTime,
    }
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function initializeApp() {
  await connectDatabase();
  
  try {
    await mlDetector.initialize();
    mlEnabled = mlDetector.isModelLoaded;
    console.log(`ML Detection ${mlEnabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.warn('ML detector initialization failed:', error.message);
  }
  
  return app;
}

module.exports = { app, initializeApp, mlDetector };
