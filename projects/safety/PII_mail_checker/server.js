
// Email PII Monitoring System with Gmail Integration and ML-Powered Detection
// Node.js backend for detecting sensitive information in emails

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Import ML PII Detector
const MLPIIDetector = require('./ml/MLPIIDetector');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }
};

app.use(rateLimiterMiddleware);

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mlEnabled: emailMonitor.mlEnabled,
    uptime: process.uptime()
  });
});

// PII Detection Patterns (Enhanced)
const PII_PATTERNS = {
  ssn: {
    regex: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    severity: 'HIGH',
    description: 'Social Security Number'
  },
  creditCard: {
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    severity: 'HIGH',
    description: 'Credit Card Number'
  },
  email: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'MEDIUM',
    description: 'Email Address'
  },
  phone: {
    regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    severity: 'MEDIUM',
    description: 'Phone Number'
  },
  bankAccount: {
    regex: /\b\d{8,17}\b/g,
    severity: 'HIGH',
    description: 'Potential Bank Account Number'
  },
  zipCode: {
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    severity: 'LOW',
    description: 'ZIP Code'
  }
};

// Sensitive Keywords (Enhanced)
const SENSITIVE_KEYWORDS = [
  'confidential', 'classified', 'restricted', 'proprietary',
  'trade secret', 'internal only', 'do not distribute',
  'salary', 'compensation', 'payroll', 'termination',
  'acquisition', 'merger', 'lawsuit', 'settlement',
  'password', 'secret', 'private', 'sensitive',
  'personal data', 'gdpr', 'hipaa', 'compliance'
];

class GmailMonitor {
  constructor() {
    this.auth = null;
    this.gmail = null;
    this.watchingEmails = false;
  }

  async authenticate() {
    try {
      // Load client secrets from credentials file
      const credentials = JSON.parse(await fs.readFile('credentials.json'));
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      
      // Load stored token
      try {
        const token = JSON.parse(await fs.readFile('token.json'));
        this.auth.setCredentials(token);
      } catch (error) {
        // Need to get new token
        console.log('⚠️  No valid token found. Run /api/auth/url to get authorization URL');
        return false;
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      console.log('✅ Gmail authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error.message);
      return false;
    }
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];
    
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getToken(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      
      // Store the token
      await fs.writeFile('token.json', JSON.stringify(tokens));
      console.log('✅ Token stored successfully');
      
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      return true;
    } catch (error) {
      console.error('❌ Error getting token:', error.message);
      return false;
    }
  }

  async getEmailContent(messageId) {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = message.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract email body
      let body = '';
      const parts = message.data.payload.parts || [message.data.payload];
      
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      return {
        id: messageId,
        from,
        to: [to],
        subject,
        body,
        timestamp: new Date(date).toISOString()
      };
    } catch (error) {
      console.error('Error getting email content:', error.message);
      return null;
    }
  }

  async startWatching() {
    if (!this.gmail) {
      console.log('❌ Gmail not authenticated');
      return false;
    }

    try {
      // Set up Gmail push notifications (requires pub/sub setup in production)
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName: 'projects/pii-monitor-project/topics/gmail-notifications'
        }
      });

      this.watchingEmails = true;
      console.log('✅ Started watching Gmail inbox');
      return true;
    } catch (error) {
      console.log('⚠️  Push notifications not configured, using polling instead');
      this.startPolling();
      return true;
    }
  }

  async startPolling() {
    let lastHistoryId = null;
    
    const poll = async () => {
      try {
        const history = await this.gmail.users.history.list({
          userId: 'me',
          startHistoryId: lastHistoryId
        });

        if (history.data.history) {
          for (const record of history.data.history) {
            if (record.messagesAdded) {
              for (const added of record.messagesAdded) {
                const emailData = await this.getEmailContent(added.message.id);
                if (emailData) {
                  const analysis = await emailMonitor.analyzeEmail(emailData);
                  if (analysis.requiresReview) {
                    console.log(`🚨 Flagged email: ${emailData.subject} (Risk: ${analysis.riskLevel})`);
                  }
                }
              }
            }
          }
        }

        lastHistoryId = history.data.historyId;
      } catch (error) {
        console.error('Polling error:', error.message);
      }
    };

    // Poll every 30 seconds
    setInterval(poll, 30000);
    console.log('🔄 Started polling Gmail every 30 seconds');
  }

  async getRecentEmails(maxResults = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox'
      });

      const emails = [];
      if (response.data.messages) {
        for (const message of response.data.messages) {
          const emailData = await this.getEmailContent(message.id);
          if (emailData) {
            emails.push(emailData);
          }
        }
      }

      return emails;
    } catch (error) {
      console.error('Error getting recent emails:', error.message);
      return [];
    }
  }
}

class EmailMonitor {
  constructor() {
    this.flaggedEmails = [];
    this.mlDetector = new MLPIIDetector();
    this.mlEnabled = false;
  }

  async initialize() {
    try {
      await this.mlDetector.initialize();
      this.mlEnabled = this.mlDetector.isModelLoaded;
      console.log(`🤖 ML Detection ${this.mlEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('⚠️  ML detector initialization failed:', error.message);
      this.mlEnabled = false;
    }
  }

  async analyzeEmail(emailData) {
    const { id, from, to, subject, body, timestamp } = emailData;
    const findings = [];
    let riskScore = 0;

    // Enhanced PII detection with ML support
    const mlResults = await this.mlDetector.detectPII(body);
    
    if (mlResults.findings.length > 0) {
      findings.push(...mlResults.findings);
      riskScore += mlResults.confidence * 10;
    }

    // Check for PII patterns (rule-based fallback)
    Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
      const matches = body.match(pattern.regex);
      if (matches) {
        // Check if not already detected by ML
        const alreadyDetected = findings.some(f => 
          f.category === type && matches.includes(f.value)
        );
        
        if (!alreadyDetected) {
          findings.push({
            type: 'PII',
            category: type,
            description: pattern.description,
            severity: pattern.severity,
            matches: matches.length,
            examples: matches.slice(0, 3),
            method: 'rule-based'
          });
          
          // Add to risk score
          riskScore += pattern.severity === 'HIGH' ? 10 : 
                      pattern.severity === 'MEDIUM' ? 5 : 2;
        }
      }
    });

    // Check for sensitive keywords
    const keywordMatches = [];
    SENSITIVE_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = body.match(regex);
      if (matches) {
        keywordMatches.push(keyword);
        riskScore += 3;
      }
    });

    if (keywordMatches.length > 0) {
      findings.push({
        type: 'KEYWORD',
        category: 'sensitive_content',
        description: 'Sensitive Keywords Detected',
        severity: 'MEDIUM',
        matches: keywordMatches.length,
        examples: keywordMatches.slice(0, 5),
        method: 'keyword-matching'
      });
    }

    // Determine overall risk level
    const riskLevel = riskScore >= 20 ? 'CRITICAL' :
                     riskScore >= 10 ? 'HIGH' :
                     riskScore >= 5 ? 'MEDIUM' : 'LOW';

    const result = {
      emailId: id,
      timestamp: timestamp || new Date().toISOString(),
      from,
      to,
      subject,
      riskLevel,
      riskScore,
      findings,
      requiresReview: riskScore >= 5,
      status: 'FLAGGED',
      mlEnhanced: this.mlEnabled,
      mlConfidence: mlResults.confidence,
      processingTime: mlResults.processingTime
    };

    // Store flagged emails
    if (result.requiresReview) {
      this.flaggedEmails.push(result);
    }

    return result;
  }

  getFlaggedEmails(filters = {}) {
    let filtered = this.flaggedEmails;

    if (filters.riskLevel) {
      filtered = filtered.filter(email => email.riskLevel === filters.riskLevel);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(email => 
        new Date(email.timestamp) >= new Date(filters.dateFrom)
      );
    }

    if (filters.mlEnhanced !== undefined) {
      filtered = filtered.filter(email => email.mlEnhanced === filters.mlEnhanced);
    }

    return filtered.sort((a, b) => b.riskScore - a.riskScore);
  }

  getStatistics() {
    const total = this.flaggedEmails.length;
    const byRisk = this.flaggedEmails.reduce((acc, email) => {
      acc[email.riskLevel] = (acc[email.riskLevel] || 0) + 1;
      return acc;
    }, {});

    const commonFindings = this.flaggedEmails
      .flatMap(email => email.findings)
      .reduce((acc, finding) => {
        const key = `${finding.type}-${finding.category}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const mlStats = this.flaggedEmails.reduce((acc, email) => {
      if (email.mlEnhanced) {
        acc.mlEnhancedCount++;
        acc.totalMlConfidence += email.mlConfidence || 0;
      }
      return acc;
    }, { mlEnhancedCount: 0, totalMlConfidence: 0 });

    return {
      totalFlagged: total,
      riskDistribution: byRisk,
      commonFindings,
      lastAnalyzed: this.flaggedEmails[0]?.timestamp || null,
      mlStats: {
        enabled: this.mlEnabled,
        enhancedCount: mlStats.mlEnhancedCount,
        averageConfidence: mlStats.mlEnhancedCount > 0 ? 
          mlStats.totalMlConfidence / mlStats.mlEnhancedCount : 0
      }
    };
  }
}

// Initialize monitors
const emailMonitor = new EmailMonitor();
const gmailMonitor = new GmailMonitor();

// Initialize ML detector
emailMonitor.initialize().catch(console.error);

// Gmail Authentication Endpoints
app.get('/api/auth/url', (req, res) => {
  try {
    const authUrl = gmailMonitor.getAuthUrl();
    res.json({
      success: true,
      authUrl,
      instructions: 'Visit this URL to authorize the application'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    const success = await gmailMonitor.getToken(code);
    
    if (success) {
      res.json({
        success: true,
        message: 'Authentication successful'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to authenticate'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/gmail/start-monitoring', async (req, res) => {
  try {
    const authenticated = await gmailMonitor.authenticate();
    if (!authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Use /api/auth/url first'
      });
    }

    const watching = await gmailMonitor.startWatching();
    res.json({
      success: true,
      monitoring: watching,
      message: 'Gmail monitoring started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/gmail/scan-recent', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const emails = await gmailMonitor.getRecentEmails(count);
    
    const results = [];
    for (const email of emails) {
      const analysis = await emailMonitor.analyzeEmail(email);
      results.push(analysis);
    }

    const flagged = results.filter(r => r.requiresReview);
    
    res.json({
      success: true,
      scanned: results.length,
      flagged: flagged.length,
      results: flagged,
      mlEnabled: emailMonitor.mlEnabled
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Endpoints
app.post('/api/analyze-email', async (req, res) => {
  try {
    // Input validation
    const { from, subject, body, to } = req.body;
    
    if (!from || !subject) {
      return res.status(400).json({
        success: false,
        error: 'From and subject are required fields'
      });
    }

    const emailData = {
      from: from.trim(),
      subject: subject.trim(),
      body: body ? body.trim() : '',
      to: to ? (Array.isArray(to) ? to : [to]) : []
    };

    const result = await emailMonitor.analyzeEmail(emailData);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Email analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/flagged-emails', (req, res) => {
  try {
    const filters = req.query;
    const flaggedEmails = emailMonitor.getFlaggedEmails(filters);
    res.json({
      success: true,
      emails: flaggedEmails,
      count: flaggedEmails.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/statistics', (req, res) => {
  try {
    const stats = emailMonitor.getStatistics();
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ML Model Management Endpoints
app.get('/api/ml/status', (req, res) => {
  try {
    const mlStats = emailMonitor.mlDetector.getStats();
    res.json({
      success: true,
      mlEnabled: emailMonitor.mlEnabled,
      stats: mlStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/ml/test', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await emailMonitor.mlDetector.detectPII(text);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update email status (for review workflow)
app.patch('/api/email/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    const email = emailMonitor.flaggedEmails.find(e => e.emailId === id);
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    email.status = status;
    email.reviewNotes = reviewNotes;
    email.reviewedAt = new Date().toISOString();

    res.json({
      success: true,
      email
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy health check (redirects to new endpoint)
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/analyze-email',
      'GET /api/flagged-emails',
      'GET /api/statistics',
      'GET /api/ml/status',
      'POST /api/ml/test',
      'GET /api/auth/url',
      'POST /api/auth/token'
    ]
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`🚀 Email PII Monitor with ML Integration running on port ${PORT}`);
  console.log(`📧 Ready to analyze emails for sensitive information`);
  console.log(`🤖 ML Detection: ${emailMonitor.mlEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Try to authenticate on startup
  try {
    await gmailMonitor.authenticate();
  } catch (error) {
    console.warn('⚠️  Gmail authentication failed on startup:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Setup Instructions:
/*
1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials and download as 'credentials.json'
3. Install dependencies: npm install
4. Train ML model: npm run train
5. Start server: npm start
6. Visit /api/auth/url to get authorization URL
7. Use /api/auth/token with the authorization code
8. Start monitoring with /api/gmail/start-monitoring

Example Gmail Integration Usage:

// Get authorization URL
curl http://localhost:3000/api/auth/url

// Exchange code for token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"code": "YOUR_AUTH_CODE"}'

// Start monitoring Gmail
curl -X POST http://localhost:3000/api/gmail/start-monitoring

// Scan recent emails
curl http://localhost:3000/api/gmail/scan-recent?count=20

// Test ML detection
curl -X POST http://localhost:3000/api/ml/test \
  -H "Content-Type: application/json" \
  -d '{"text": "My SSN is 123-45-6789"}'

*/