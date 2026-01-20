const request = require('supertest');

describe('API Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    const { app: testApp, initializeApp } = require('../../src/app');
    await initializeApp();
    app = testApp;
  });

  afterAll(async () => {
    const { disconnectDatabase } = require('../../src/config/database');
    await disconnectDatabase();
  });

  describe('Health Check', () => {
    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Email Analysis', () => {
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
      expect(response.body.result).toHaveProperty('riskLevel');
      expect(response.body.result).toHaveProperty('findings');
    });

    test('POST /api/analyze-email should require from and subject', async () => {
      const response = await request(app)
        .post('/api/analyze-email')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/analyze-email should handle safe content', async () => {
      const emailData = {
        from: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a regular email with no sensitive information'
      };

      const response = await request(app)
        .post('/api/analyze-email')
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.riskLevel).toBe('LOW');
    });
  });

  describe('ML Endpoints', () => {
    test('GET /api/ml/status should return ML status', async () => {
      const response = await request(app)
        .get('/api/ml/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mlEnabled');
      expect(response.body).toHaveProperty('stats');
    });

    test('POST /api/ml/test should test ML detection', async () => {
      const response = await request(app)
        .post('/api/ml/test')
        .send({ text: 'My SSN is 123-45-6789' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('findings');
    });

    test('POST /api/ml/test should require text', async () => {
      const response = await request(app)
        .post('/api/ml/test')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Auth Endpoints', () => {
    test('POST /api/auth/login should require credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('GET /api/auth/me should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('404 Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
