// Test setup file for Jest
// This file runs before each test

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 3001; // Use different port for tests
process.env.ML_ENABLED = 'false'; // Disable ML for faster tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Increase timeout for async operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Helper to create mock email data
  createMockEmail: (overrides = {}) => ({
    from: 'test@example.com',
    subject: 'Test Email',
    body: 'This is a test email body',
    to: ['recipient@example.com'],
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  // Helper to create mock PII data
  createMockPII: (type = 'ssn', value = '123-45-6789') => ({
    type: 'PII',
    category: type,
    value: value,
    confidence: 0.9,
    context: 'test context',
    method: 'rule-based',
    validation: true
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
}); 