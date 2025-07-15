const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');

/**
 * Training script for PII Detection ML Model
 * Creates and trains a TensorFlow model for enhanced PII detection
 */
class PIITrainer {
  constructor() {
    this.model = null;
    this.vocabSize = 1000;
    this.maxLength = 200;
    this.embeddingDim = 64;
    this.epochs = 10;
    this.batchSize = 32;
  }

  /**
   * Create the neural network model
   */
  createModel() {
    this.model = tf.sequential({
      layers: [
        // Embedding layer for text representation
        tf.layers.embedding({
          inputDim: this.vocabSize,
          outputDim: this.embeddingDim,
          inputLength: this.maxLength
        }),
        
        // Bidirectional LSTM for sequence understanding
        tf.layers.bidirectional({
          layer: tf.layers.lstm({
            units: 64,
            returnSequences: true,
            dropout: 0.2,
            recurrentDropout: 0.2
          })
        }),
        
        // Global max pooling
        tf.layers.globalMaxPooling1d(),
        
        // Dense layers for classification
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          dropout: 0.5
        }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          dropout: 0.3
        }),
        
        // Output layer (binary classification: PII or not)
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    // Compile the model
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ Model created successfully');
    this.model.summary();
  }

  /**
   * Load training data from generated dataset
   */
  async loadTrainingData() {
    const dataPath = path.join(__dirname, 'synthetic_training_data.json');
    
    try {
      // Check if synthetic data exists
      await fs.access(dataPath);
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      
      const trainingData = data.map(item => item.text);
      const labels = data.map(item => item.label);
      
      console.log(`📊 Loaded ${trainingData.length} samples from synthetic dataset`);
      return { trainingData, labels };
      
    } catch (error) {
      console.log('⚠️  No synthetic dataset found, generating basic training data...');
      return this.generateBasicTrainingData();
    }
  }

  /**
   * Generate basic training data (fallback)
   */
  generateBasicTrainingData() {
    const trainingData = [];
    const labels = [];

    // Positive examples (containing PII)
    const positiveExamples = [
      'My social security number is 123-45-6789',
      'Please send payment to card 1234-5678-9012-3456',
      'Contact me at john.doe@example.com',
      'Call me at 555-123-4567',
      'Account number: 9876543210',
      'SSN: 987-65-4321 for verification',
      'Credit card: 1111-2222-3333-4444',
      'Email: jane.smith@company.org',
      'Phone: (555) 987-6543',
      'Routing number: 123456789',
      'My SSN is 456-78-9012',
      'Card number 5555-6666-7777-8888',
      'Reach me at contact@business.com',
      'Mobile: 555-555-5555',
      'Bank account: 1122334455667788'
    ];

    // Negative examples (no PII)
    const negativeExamples = [
      'The meeting is scheduled for tomorrow',
      'Please review the attached document',
      'The project deadline is next week',
      'We need to discuss the budget',
      'The weather is nice today',
      'Page 123 of the report',
      'Chapter 5 contains important information',
      'Version 2.1 of the software',
      'The price is $123.45',
      'Room number 456 on the third floor',
      'The temperature is 72 degrees',
      'The file size is 1.5 MB',
      'The meeting starts at 3 PM',
      'The building has 10 floors',
      'The document is 25 pages long'
    ];

    // Add positive examples
    positiveExamples.forEach(example => {
      trainingData.push(example);
      labels.push(1); // PII present
    });

    // Add negative examples
    negativeExamples.forEach(example => {
      trainingData.push(example);
      labels.push(0); // No PII
    });

    return { trainingData, labels };
  }

  /**
   * Preprocess text data
   */
  preprocessText(texts) {
    // Simple tokenization and vectorization
    const tokenized = texts.map(text => 
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0)
    );

    // Build vocabulary
    const vocab = new Map();
    const allWords = new Set();
    
    tokenized.forEach(tokens => {
      tokens.forEach(token => allWords.add(token));
    });

    const sortedWords = Array.from(allWords).sort();
    sortedWords.slice(0, this.vocabSize - 1).forEach((word, index) => {
      vocab.set(word, index + 1); // Reserve 0 for padding
    });

    // Convert to sequences
    const sequences = tokenized.map(tokens => {
      const sequence = tokens.map(token => vocab.get(token) || 0);
      return this.padSequence(sequence, this.maxLength);
    });

    return {
      sequences: tf.tensor2d(sequences),
      vocab: vocab
    };
  }

  /**
   * Pad sequence to fixed length
   */
  padSequence(sequence, maxLength) {
    const padded = new Array(maxLength).fill(0);
    for (let i = 0; i < Math.min(sequence.length, maxLength); i++) {
      padded[i] = sequence[i];
    }
    return padded;
  }

  /**
   * Train the model
   */
  async train() {
    console.log('🚀 Starting model training...');

    // Create model
    this.createModel();

    // Load training data
    const { trainingData, labels } = await this.loadTrainingData();
    console.log(`📊 Using ${trainingData.length} training examples`);

    // Preprocess data
    const { sequences, vocab } = this.preprocessText(trainingData);
    const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

    // Split into training and validation sets
    const splitIndex = Math.floor(sequences.shape[0] * 0.8);
    
    const trainSequences = sequences.slice([0, 0], [splitIndex, -1]);
    const trainLabels = labelTensor.slice([0, 0], [splitIndex, -1]);
    
    const valSequences = sequences.slice([splitIndex, 0], [-1, -1]);
    const valLabels = labelTensor.slice([splitIndex, 0], [-1, -1]);

    console.log(`📈 Training on ${trainSequences.shape[0]} samples, validating on ${valSequences.shape[0]} samples`);

    // Train the model
    const history = await this.model.fit(trainSequences, trainLabels, {
      epochs: this.epochs,
      batchSize: this.batchSize,
      validationData: [valSequences, valLabels],
      callbacks: [
        tf.callbacks.earlyStopping({
          monitor: 'val_loss',
          patience: 3
        }),
        tf.callbacks.tensorBoard('./logs')
      ]
    });

    console.log('✅ Training completed!');
    console.log('📊 Training History:', history.history);

    // Evaluate model
    const evaluation = this.model.evaluate(valSequences, valLabels);
    console.log('📈 Model Evaluation:');
    console.log(`   Loss: ${evaluation[0].dataSync()[0].toFixed(4)}`);
    console.log(`   Accuracy: ${evaluation[1].dataSync()[0].toFixed(4)}`);

    // Calculate precision and recall
    const metrics = this.calculateMetrics(valSequences, valLabels);
    console.log(`   Precision: ${metrics.precision.toFixed(4)}`);
    console.log(`   Recall: ${metrics.recall.toFixed(4)}`);
    console.log(`   F1-Score: ${metrics.f1Score.toFixed(4)}`);

    // Save model and vocabulary
    await this.saveModel(vocab);

    // Clean up tensors
    sequences.dispose();
    labelTensor.dispose();
    trainSequences.dispose();
    trainLabels.dispose();
    valSequences.dispose();
    valLabels.dispose();
  }

  /**
   * Save the trained model
   */
  async saveModel(vocab) {
    const modelDir = path.join(__dirname, 'models', 'pii-detector-model');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(modelDir, { recursive: true });
      
      // Save TensorFlow model
      await this.model.save(`file://${modelDir}`);
      
      // Save vocabulary
      const vocabData = Object.fromEntries(vocab);
      await fs.writeFile(
        path.join(modelDir, 'vocab.json'),
        JSON.stringify(vocabData, null, 2)
      );
      
      // Save model metadata
      const metadata = {
        vocabSize: this.vocabSize,
        maxLength: this.maxLength,
        embeddingDim: this.embeddingDim,
        trainingDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await fs.writeFile(
        path.join(modelDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`💾 Model saved to ${modelDir}`);
      
    } catch (error) {
      console.error('❌ Error saving model:', error.message);
    }
  }

  /**
   * Calculate precision, recall, and F1-score
   */
  calculateMetrics(valSequences, valLabels) {
    // Get predictions
    const predictions = this.model.predict(valSequences);
    const predData = predictions.dataSync();
    const trueData = valLabels.dataSync();
    
    // Convert to binary predictions (threshold = 0.5)
    const binaryPreds = predData.map(p => p > 0.5 ? 1 : 0);
    
    // Calculate confusion matrix values
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;
    
    for (let i = 0; i < binaryPreds.length; i++) {
      const pred = binaryPreds[i];
      const true_val = trueData[i];
      
      if (pred === 1 && true_val === 1) truePositives++;
      else if (pred === 1 && true_val === 0) falsePositives++;
      else if (pred === 0 && true_val === 1) falseNegatives++;
      else if (pred === 0 && true_val === 0) trueNegatives++;
    }
    
    // Calculate metrics
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    // Clean up
    predictions.dispose();
    
    return {
      precision,
      recall,
      f1Score,
      truePositives,
      falsePositives,
      falseNegatives,
      trueNegatives
    };
  }

  /**
   * Test the trained model
   */
  async testModel() {
    const testExamples = [
      'My SSN is 123-45-6789',           // Should detect PII
      'Call me at 555-123-4567',         // Should detect PII
      'The meeting is tomorrow',         // Should not detect PII
      'Email me at test@example.com',    // Should detect PII
      'The price is $50.00'              // Should not detect PII
    ];

    console.log('🧪 Testing model with sample inputs...');

    for (const example of testExamples) {
      const prediction = await this.predict(example);
      console.log(`"${example}" -> PII Probability: ${(prediction * 100).toFixed(2)}%`);
    }
  }

  /**
   * Make prediction on single text
   */
  async predict(text) {
    // Preprocess the text
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    // Load vocabulary
    const vocabPath = path.join(__dirname, 'models', 'pii-detector-model', 'vocab.json');
    const vocabData = JSON.parse(await fs.readFile(vocabPath, 'utf8'));
    
    // Convert to sequence
    const sequence = tokens.map(token => vocabData[token] || 0);
    const paddedSequence = this.padSequence(sequence, this.maxLength);
    
    // Make prediction
    const input = tf.tensor2d([paddedSequence]);
    const prediction = this.model.predict(input);
    const result = prediction.dataSync()[0];
    
    // Clean up
    input.dispose();
    prediction.dispose();
    
    return result;
  }
}

// Main execution
async function main() {
  const trainer = new PIITrainer();
  
  try {
    await trainer.train();
    await trainer.testModel();
  } catch (error) {
    console.error('❌ Training failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PIITrainer; 