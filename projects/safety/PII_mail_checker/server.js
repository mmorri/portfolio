
// Email PII Monitoring System with Gmail Integration
// Node.js backend for detecting sensitive information in emails

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const app = express();
app.use(express.json());

// PII Detection Patterns
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

// Sensitive Keywords
const SENSITIVE_KEYWORDS = [
  'confidential', 'classified', 'restricted', 'proprietary',
  'trade secret', 'internal only', 'do not distribute',
  'salary', 'compensation', 'payroll', 'termination',
  'acquisition', 'merger', 'lawsuit', 'settlement'
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
          topicName: 'projects/your-project/topics/gmail-notifications'
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
                  const analysis = emailMonitor.analyzeEmail(emailData);
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
  }

  analyzeEmail(emailData) {
    const { id, from, to, subject, body, timestamp } = emailData;
    const findings = [];
    let riskScore = 0;

    // Check for PII patterns
    Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
      const matches = body.match(pattern.regex);
      if (matches) {
        findings.push({
          type: 'PII',
          category: type,
          description: pattern.description,
          severity: pattern.severity,
          matches: matches.length,
          examples: matches.slice(0, 3) // Show first 3 matches
        });
        
        // Add to risk score
        riskScore += pattern.severity === 'HIGH' ? 10 : 
                    pattern.severity === 'MEDIUM' ? 5 : 2;
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
        examples: keywordMatches.slice(0, 5)
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
      status: 'FLAGGED'
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

    return {
      totalFlagged: total,
      riskDistribution: byRisk,
      commonFindings,
      lastAnalyzed: this.flaggedEmails[0]?.timestamp || null
    };
  }
}

// Initialize monitors
const emailMonitor = new EmailMonitor();
const gmailMonitor = new GmailMonitor();

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
      const analysis = emailMonitor.analyzeEmail(email);
      results.push(analysis);
    }

    const flagged = results.filter(r => r.requiresReview);
    
    res.json({
      success: true,
      scanned: results.length,
      flagged: flagged.length,
      results: flagged
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Endpoints
app.post('/api/analyze-email', (req, res) => {
  try {
    const result = emailMonitor.analyzeEmail(req.body);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Email PII Monitor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Email PII Monitor with Gmail Integration running on port ${PORT}`);
  console.log(`📧 Ready to analyze emails for sensitive information`);
  
  // Try to authenticate on startup
  await gmailMonitor.authenticate();
});

// Setup Instructions:
/*
1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials and download as 'credentials.json'
3. Install dependencies: npm install googleapis express
4. Start server: node server.js
5. Visit /api/auth/url to get authorization URL
6. Use /api/auth/token with the authorization code
7. Start monitoring with /api/gmail/start-monitoring

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

*/

// Package.json dependencies needed:
/*
{
  "dependencies": {
    "express": "^4.18.2",
    "googleapis": "^118.0.0"
  }
}
*/