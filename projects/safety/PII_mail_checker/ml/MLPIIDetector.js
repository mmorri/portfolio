const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const nlp = require('compromise');
const path = require('path');
const fs = require('fs').promises;

/**
 * ML-Powered PII Detection System
 * Combines rule-based patterns with machine learning for enhanced accuracy
 */
class MLPIIDetector {
  constructor() {
    this.model = null;
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.confidenceThreshold = 0.8;
    this.contextWindow = 50; // characters around potential PII
    this.isModelLoaded = false;
    
    // Enhanced pattern recognition
    this.enhancedPatterns = {
      ssn: {
        regex: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        contextKeywords: ['ssn', 'social security', 'social security number', 'ss#'],
        validation: this.validateSSN.bind(this)
      },
      creditCard: {
        regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        contextKeywords: ['credit card', 'card number', 'cc#', 'visa', 'mastercard', 'amex'],
        validation: this.validateCreditCard.bind(this)
      },
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        contextKeywords: ['email', 'e-mail', 'contact', 'send to'],
        validation: this.validateEmail.bind(this)
      },
      phone: {
        regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        contextKeywords: ['phone', 'telephone', 'mobile', 'cell', 'call'],
        validation: this.validatePhone.bind(this)
      },
      bankAccount: {
        regex: /\b\d{8,17}\b/g,
        contextKeywords: ['account', 'routing', 'aba', 'swift', 'iban'],
        validation: this.validateBankAccount.bind(this)
      }
    };
  }

  /**
   * Initialize the ML model
   */
  async initialize() {
    try {
      await this.loadModel();
      await this.trainClassifier();
      this.isModelLoaded = true;
      console.log('✅ ML PII Detector initialized successfully');
    } catch (error) {
      console.warn('⚠️  ML model not available, falling back to rule-based detection');
      this.isModelLoaded = false;
    }
  }

  /**
   * Load pre-trained TensorFlow model
   */
  async loadModel() {
    try {
      const modelPath = path.join(__dirname, 'models', 'pii-detector-model');
      if (await this.modelExists(modelPath)) {
        this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
        console.log('✅ Pre-trained model loaded');
      } else {
        console.log('📝 No pre-trained model found, will use rule-based detection');
      }
    } catch (error) {
      console.warn('⚠️  Could not load model:', error.message);
    }
  }

  /**
   * Train the classifier with sample data
   */
  async trainClassifier() {
    // Train with positive examples
    this.classifier.addDocument('my ssn is 123-45-6789', 'ssn');
    this.classifier.addDocument('social security number: 987-65-4321', 'ssn');
    this.classifier.addDocument('credit card: 1234-5678-9012-3456', 'creditCard');
    this.classifier.addDocument('card number 1111-2222-3333-4444', 'creditCard');
    this.classifier.addDocument('email me at john@example.com', 'email');
    this.classifier.addDocument('contact: jane.doe@company.org', 'email');
    this.classifier.addDocument('call me at 555-123-4567', 'phone');
    this.classifier.addDocument('phone: (555) 987-6543', 'phone');
    this.classifier.addDocument('account number: 1234567890', 'bankAccount');
    this.classifier.addDocument('routing number 987654321', 'bankAccount');

    // Train with negative examples
    this.classifier.addDocument('my favorite number is 123', 'safe');
    this.classifier.addDocument('the price is $123.45', 'safe');
    this.classifier.addDocument('room number 123', 'safe');
    this.classifier.addDocument('page 123 of the document', 'safe');

    this.classifier.train();
  }

  /**
   * Enhanced PII detection with ML support
   */
  async detectPII(text) {
    const results = {
      findings: [],
      confidence: 0,
      mlEnhanced: this.isModelLoaded,
      processingTime: 0
    };

    const startTime = Date.now();

    // Rule-based detection
    const ruleBasedFindings = this.detectWithRules(text);
    
    // ML-enhanced detection
    let mlFindings = [];
    if (this.isModelLoaded) {
      mlFindings = await this.detectWithML(text);
    }

    // Combine and validate findings
    const combinedFindings = this.combineFindings(ruleBasedFindings, mlFindings);
    
    // Context-aware validation
    const validatedFindings = await this.validateWithContext(text, combinedFindings);
    
    results.findings = validatedFindings;
    results.confidence = this.calculateConfidence(validatedFindings);
    results.processingTime = Date.now() - startTime;

    return results;
  }

  /**
   * Rule-based PII detection with enhanced patterns
   */
  detectWithRules(text) {
    const findings = [];

    Object.entries(this.enhancedPatterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          const context = this.extractContext(text, match);
          const contextScore = this.calculateContextScore(context, pattern.contextKeywords);
          
          findings.push({
            type: 'PII',
            category: type,
            value: match,
            confidence: contextScore,
            context: context,
            method: 'rule-based',
            validation: pattern.validation(match)
          });
        });
      }
    });

    return findings;
  }

  /**
   * ML-based PII detection
   */
  async detectWithML(text) {
    const findings = [];
    
    try {
      // Use NLP for named entity recognition
      const doc = nlp(text);
      const entities = doc.match('#Email+ #Phone+ #Cardinal+').out('array');
      
      // Use trained classifier for context classification
      const classification = this.classifier.classify(text);
      
      // Use TensorFlow model if available
      if (this.model) {
        const tensor = this.textToTensor(text);
        const prediction = await this.model.predict(tensor).array();
        const confidence = prediction[0][0];
        
        if (confidence > this.confidenceThreshold) {
          findings.push({
            type: 'PII',
            category: 'ml-detected',
            confidence: confidence,
            method: 'ml-model',
            entities: entities
          });
        }
      }
      
    } catch (error) {
      console.warn('ML detection error:', error.message);
    }

    return findings;
  }

  /**
   * Extract context around potential PII
   */
  extractContext(text, match) {
    const matchIndex = text.indexOf(match);
    const start = Math.max(0, matchIndex - this.contextWindow);
    const end = Math.min(text.length, matchIndex + match.length + this.contextWindow);
    return text.substring(start, end);
  }

  /**
   * Calculate context relevance score
   */
  calculateContextScore(context, keywords) {
    const contextLower = context.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      if (contextLower.includes(keyword.toLowerCase())) {
        score += 0.3;
      }
    });
    
    return Math.min(score, 1.0);
  }

  /**
   * Validate findings with context and rules
   */
  async validateWithContext(text, findings) {
    return findings.filter(finding => {
      // Apply validation rules
      if (finding.validation === false) {
        return false;
      }
      
      // Check for false positives
      if (this.isFalsePositive(finding, text)) {
        return false;
      }
      
      // Apply confidence threshold
      return finding.confidence >= this.confidenceThreshold;
    });
  }

  /**
   * Combine rule-based and ML findings
   */
  combineFindings(ruleFindings, mlFindings) {
    const combined = [...ruleFindings];
    
    mlFindings.forEach(mlFinding => {
      // Check if ML finding overlaps with rule finding
      const overlap = ruleFindings.find(ruleFinding => 
        ruleFinding.value === mlFinding.value || 
        ruleFinding.category === mlFinding.category
      );
      
      if (!overlap) {
        combined.push(mlFinding);
      } else {
        // Enhance confidence if both methods agree
        overlap.confidence = Math.min(1.0, overlap.confidence + 0.2);
        overlap.method = 'hybrid';
      }
    });
    
    return combined;
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(findings) {
    if (findings.length === 0) return 0;
    
    const totalConfidence = findings.reduce((sum, finding) => sum + finding.confidence, 0);
    return totalConfidence / findings.length;
  }

  /**
   * Validation methods for different PII types
   */
  validateSSN(ssn) {
    // Remove non-digits
    const clean = ssn.replace(/\D/g, '');
    
    // Check length
    if (clean.length !== 9) return false;
    
    // Check for invalid patterns (all same digits, 000-00-0000, etc.)
    if (/^(\d)\1{8}$/.test(clean)) return false;
    if (clean === '000000000') return false;
    
    return true;
  }

  validateCreditCard(card) {
    const clean = card.replace(/\D/g, '');
    
    // Check length
    if (clean.length < 13 || clean.length > 19) return false;
    
    // Luhn algorithm check
    return this.luhnCheck(clean);
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone) {
    const clean = phone.replace(/\D/g, '');
    return clean.length >= 10 && clean.length <= 15;
  }

  validateBankAccount(account) {
    const clean = account.replace(/\D/g, '');
    return clean.length >= 8 && clean.length <= 17;
  }

  /**
   * Luhn algorithm for credit card validation
   */
  luhnCheck(number) {
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Check for false positives
   */
  isFalsePositive(finding, text) {
    const falsePositivePatterns = [
      /page\s+\d+/,           // Page numbers
      /chapter\s+\d+/,        // Chapter numbers
      /version\s+\d+/,        // Version numbers
      /\$\d+\.\d{2}/,         // Currency amounts
      /#\d+/,                 // Hashtags
      /@\w+/,                 // Mentions
    ];
    
    return falsePositivePatterns.some(pattern => 
      pattern.test(finding.value)
    );
  }

  /**
   * Convert text to tensor for ML model
   */
  textToTensor(text) {
    // Simple tokenization and vectorization
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const vocab = this.buildVocabulary(tokens);
    const vector = new Array(vocab.size).fill(0);
    
    tokens.forEach(token => {
      if (vocab.has(token)) {
        vector[vocab.get(token)] = 1;
      }
    });
    
    return tf.tensor2d([vector], [1, vocab.size]);
  }

  /**
   * Build vocabulary from tokens
   */
  buildVocabulary(tokens) {
    const vocab = new Map();
    const uniqueTokens = [...new Set(tokens)];
    
    uniqueTokens.forEach((token, index) => {
      vocab.set(token, index);
    });
    
    return vocab;
  }

  /**
   * Check if model exists
   */
  async modelExists(modelPath) {
    try {
      await fs.access(path.join(modelPath, 'model.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      modelLoaded: this.isModelLoaded,
      confidenceThreshold: this.confidenceThreshold,
      patternsCount: Object.keys(this.enhancedPatterns).length,
      classifierTrained: this.classifier.getClassifications('test').length > 0
    };
  }
}

module.exports = MLPIIDetector; 