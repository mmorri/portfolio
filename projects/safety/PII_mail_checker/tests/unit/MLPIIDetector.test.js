const MLPIIDetector = require('../../ml/MLPIIDetector');

describe('MLPIIDetector', () => {
  let detector;

  beforeEach(async () => {
    detector = new MLPIIDetector();
    await detector.initialize();
  });

  describe('PII Detection', () => {
    test('should detect SSN in text', async () => {
      const text = 'My social security number is 123-45-6789';
      const result = await detector.detectPII(text);
      
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('ssn');
      expect(result.findings[0].value).toBe('123-45-6789');
    });

    test('should detect credit card in text', async () => {
      const text = 'Please charge 1234-5678-9012-3456';
      const result = await detector.detectPII(text);
      
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('creditCard');
      expect(result.findings[0].value).toBe('1234-5678-9012-3456');
    });

    test('should detect email in text', async () => {
      const text = 'Contact me at john.doe@example.com';
      const result = await detector.detectPII(text);
      
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('email');
      expect(result.findings[0].value).toBe('john.doe@example.com');
    });

    test('should detect phone number in text', async () => {
      const text = 'Call me at 555-123-4567';
      const result = await detector.detectPII(text);
      
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].category).toBe('phone');
      expect(result.findings[0].value).toBe('555-123-4567');
    });

    test('should not detect PII in safe text', async () => {
      const text = 'The meeting is scheduled for tomorrow at 3 PM';
      const result = await detector.detectPII(text);
      
      expect(result.findings).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    test('should handle multiple PII types in same text', async () => {
      const text = 'My SSN is 123-45-6789 and email is john@example.com';
      const result = await detector.detectPII(text);
      
      expect(result.findings.length).toBeGreaterThanOrEqual(2);
      const categories = result.findings.map(f => f.category);
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
      expect(detector.validateSSN('123-45-678')).toBe(false); // Too short
      expect(detector.validateSSN('123-45-67890')).toBe(false); // Too long
      expect(detector.validateSSN('000-00-0000')).toBe(false); // Invalid pattern
    });

    test('should validate correct credit card', () => {
      expect(detector.validateCreditCard('4532015112830366')).toBe(true); // Visa
    });

    test('should reject invalid credit card', () => {
      expect(detector.validateCreditCard('4532015112830367')).toBe(false); // Invalid checksum
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

  describe('False Positive Detection', () => {
    test('should not flag page numbers as PII', async () => {
      const text = 'See page 123 for more details';
      const result = await detector.detectPII(text);
      
      const hasPageNumber = result.findings.some(f => 
        f.value === '123' && f.category === 'bankAccount'
      );
      expect(hasPageNumber).toBe(false);
    });

    test('should not flag currency as PII', async () => {
      const text = 'The price is $123.45';
      const result = await detector.detectPII(text);
      
      const hasCurrency = result.findings.some(f => 
        f.value === '123.45' && f.category === 'bankAccount'
      );
      expect(hasCurrency).toBe(false);
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
      
      expect(score).toBeGreaterThan(0.5);
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
}); 