const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client
let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }
  return prisma;
}

async function connectDatabase() {
  const client = getPrismaClient();
  try {
    await client.$connect();
    console.log('Connected to PostgreSQL database');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    return false;
  }
}

async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

module.exports = {
  getPrismaClient,
  connectDatabase,
  disconnectDatabase,
};
