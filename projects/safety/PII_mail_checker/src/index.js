const http = require('http');
const { app, initializeApp } = require('./app');
const websocketService = require('./services/websocketService');
const config = require('./config');
const { disconnectDatabase } = require('./config/database');

async function start() {
  await initializeApp();
  
  const server = http.createServer(app);
  
  websocketService.initialize(server);
  
  server.listen(config.port, () => {
    console.log(`Email PII Monitor running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    
    server.close(async () => {
      await disconnectDatabase();
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
