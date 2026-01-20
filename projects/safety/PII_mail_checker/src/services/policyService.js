const { getPrismaClient } = require('../config/database');

const DEFAULT_POLICY = {
  enabledPiiTypes: ['ssn', 'creditCard', 'email', 'phone', 'bankAccount'],
  confidenceThreshold: 0.8,
  highSeverityScore: 10,
  criticalSeverityScore: 20,
  allowedDomains: [],
  allowedSenders: [],
  emailNotifications: true,
  notifyOnSeverity: 'HIGH',
};

async function getOrCreatePolicy(userId) {
  const prisma = getPrismaClient();
  
  let policy = await prisma.policy.findFirst({
    where: { userId, isActive: true }
  });
  
  if (!policy) {
    policy = await prisma.policy.create({
      data: {
        userId,
        ...DEFAULT_POLICY,
      }
    });
  }
  
  return policy;
}

async function updatePolicy(userId, updates) {
  const prisma = getPrismaClient();
  
  const policy = await getOrCreatePolicy(userId);
  
  return prisma.policy.update({
    where: { id: policy.id },
    data: {
      ...updates,
      updatedAt: new Date(),
    }
  });
}

async function getPolicyById(id) {
  const prisma = getPrismaClient();
  return prisma.policy.findUnique({ where: { id } });
}

function shouldProcessPiiType(policy, piiType) {
  return policy.enabledPiiTypes.includes(piiType);
}

function isAllowedSender(policy, senderEmail) {
  if (!policy.allowedSenders.length) return false;
  
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase();
  
  return policy.allowedSenders.some(allowed => {
    const lower = allowed.toLowerCase();
    return senderEmail.toLowerCase() === lower || senderDomain === lower;
  });
}

function isAllowedDomain(policy, email) {
  if (!policy.allowedDomains.length) return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  return policy.allowedDomains.some(d => d.toLowerCase() === domain);
}

function calculateSeverity(policy, riskScore) {
  if (riskScore >= policy.criticalSeverityScore) return 'CRITICAL';
  if (riskScore >= policy.highSeverityScore) return 'HIGH';
  if (riskScore >= 5) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  DEFAULT_POLICY,
  getOrCreatePolicy,
  updatePolicy,
  getPolicyById,
  shouldProcessPiiType,
  isAllowedSender,
  isAllowedDomain,
  calculateSeverity,
};
