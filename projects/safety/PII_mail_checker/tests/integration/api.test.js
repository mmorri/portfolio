const request = require('supertest');
const express = require('express');
const server = require('../../server');

const app = express();
app.use(express.json());

// Import the server routes
const serverApp = server;

describe('API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Create a test server instance
    app = express();
    app.use(express.json());
    
    // Import and apply server routes
    const serverModule = require('../../server');
    // Note: This is a simplified test setup - in a real scenario,
    // you'd want to mock the ML detector and Gmail integration
  });

  describe('Health Check Endpoints', () => {
    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('service', 'Email PII Monitor with ML');
    });
  });

  describe('Email Analysis Endpoints', () => {
    test('POST /api/analyze-email should analyze email content', async () => {
      const emailData = {
        from: 'test@example.com',
        subject: 'Test Email',
        body: 'My social security number is 123-45-6789'
      };

      const response = await request(app)
        .post('/api/analyze-email')
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('requiresReview');
    });

    test('POST /api/analyze-email should handle missing body', async () => {
      const emailData = {
        from: 'test@example.com',
        subject: 'Test Email'
        // Missing body
      };

      const response = await request(app)
        .post('/api/analyze-email')
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('ML Model Endpoints', () => {
    test('GET /api/ml/status should return ML status', async () => {
      const response = await request(app)
        .get('/api/ml/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mlEnabled');
      expect(response.body).toHaveProperty('stats');
    });

    test('POST /api/ml/test should test ML detection', async () => {
      const testData = {
        text: 'My SSN is 123-45-6789'
      };

      const response = await request(app)
        .post('/api/ml/test')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
    });

    test('POST /api/ml/test should require text parameter', async () => {
      const response = await request(app)
        .post('/api/ml/test')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Email Management Endpoints', () => {
    test('GET /api/flagged-emails should return flagged emails', async () => {
      const response = await request(app)
        .get('/api/flagged-emails')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('emails');
      expect(response.body).toHaveProperty('count');
    });

    test('GET /api/statistics should return monitoring statistics', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('statistics');
    });
  });

  describe('Gmail Integration Endpoints', () => {
    test('GET /api/auth/url should return auth URL', async () => {
      const response = await request(app)
        .get('/api/auth/url')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('instructions');
    });

    test('POST /api/auth/token should handle auth code', async () => {
      const authData = {
        code: 'test_auth_code'
      };

      // This will likely fail without proper credentials, but we test the endpoint structure
      const response = await request(app)
        .post('/api/auth/token')
        .send(authData);

      // Should either succeed or return appropriate error
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/analyze-email')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing required fields gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze-email')
        .send({})
        .expect(200); // Should handle empty request gracefully
    });
  });
}); 