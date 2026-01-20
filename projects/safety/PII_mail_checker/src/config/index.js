require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 24 * 60 * 60 * 1000, // 24 hours
  
  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  
  // Rate limiting
  rateLimitPoints: parseInt(process.env.RATE_LIMIT_POINTS, 10) || 100,
  rateLimitDuration: parseInt(process.env.RATE_LIMIT_DURATION, 10) || 60,
  
  // ML
  mlEnabled: process.env.ML_ENABLED !== 'false',
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.8,
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'],
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
};

module.exports = config;
