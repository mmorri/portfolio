const MLPIIDetector = require('../../ml/MLPIIDetector');

describe('MLPIIDetector', () => {
  let detector;

  beforeAll(async () => {
    detector = new MLPIIDetector();
    detector.confidenceThreshold = 0;
    await detector.initialize();
  });

  describe('PII Detection', () => {
    test('should detect SSN with context', async () => {
      const text = 'My SSN social security number is 123-45-6789';
      const result = await detector.detectPII(text);
      
      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      const ssnFinding = result.findings.find(f => f.category === 'ssn');
      expect(ssnFinding).toBeDefined();
    });

    test('should detect credit card with rules', () => {
      const text = 'Credit card number: 1234-5678-9012-3456';
      const findings = detector.detectWithRules(text);
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const ccFinding = findings.find(f => f.category === 'creditCard');
      expect(ccFinding).toBeDefined();
    });

    test('should detect email with rules', () => {
      const text = 'Email contact me at john.doe@example.com';
      const findings = detector.detectWithRules(text);
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const emailFinding = findings.find(f => f.category === 'email');
      expect(emailFinding).toBeDefined();
    });

    test('should detect phone with rules', () => {
      const text = 'Call my phone number 555-123-4567';
      const findings = detector.detectWithRules(text);
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const phoneFinding = findings.find(f => f.category === 'phone');
      expect(phoneFinding).toBeDefined();
    });

    test('should detect multiple PII types with rules', () => {
      const text = 'My SSN social security is 123-45-6789 and email john@example.com';
      const findings = detector.detectWithRules(text);
      
      expect(findings.length).toBeGreaterThanOrEqual(2);
      const categories = findings.map(f => f.category);
      expect(categories).toContain('ssn');
      expect(categories).toContain('email');
    });
  });

  describe('Validation Methods', () => {
    test('should validate correct SSN', () => {
      expect(detector.validateSSN('123-45-6789')).toBe(true);
      expect(detector.validateSSN('123456789')).toBe(true);
    });

    test('should reject invalid SSN', () => {
      expect(detector.validateSSN('123-45-678')).toBe(false);
      expect(detector.validateSSN('123-45-67890')).toBe(false);
      expect(detector.validateSSN('000-00-0000')).toBe(false);
    });

    test('should validate correct credit card', () => {
      expect(detector.validateCreditCard('4532015112830366')).toBe(true);
    });

    test('should reject invalid credit card', () => {
      expect(detector.validateCreditCard('4532015112830367')).toBe(false);
    });

    test('should validate correct email', () => {
      expect(detector.validateEmail('test@example.com')).toBe(true);
      expect(detector.validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(detector.validateEmail('invalid-email')).toBe(false);
      expect(detector.validateEmail('test@')).toBe(false);
    });
  });

  describe('Context Analysis', () => {
    test('should extract context around PII', () => {
      const text = 'My social security number is 123-45-6789 for verification';
      const context = detector.extractContext(text, '123-45-6789');
      
      expect(context).toContain('social security number');
      expect(context).toContain('verification');
    });

    test('should calculate context score', () => {
      const context = 'My social security number is 123-45-6789';
      const keywords = ['ssn', 'social security', 'social security number'];
      const score = detector.calculateContextScore(context, keywords);
      
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    test('should return detector statistics', () => {
      const stats = detector.getStats();
      
      expect(stats).toHaveProperty('modelLoaded');
      expect(stats).toHaveProperty('confidenceThreshold');
      expect(stats).toHaveProperty('patternsCount');
      expect(stats).toHaveProperty('classifierTrained');
    });
  });

  describe('Rule-based Detection', () => {
    test('should detect with rules even without ML', () => {
      const findings = detector.detectWithRules('SSN: 123-45-6789');
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});
