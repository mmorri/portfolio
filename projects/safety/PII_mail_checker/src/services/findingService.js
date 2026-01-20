const { getPrismaClient } = require('../config/database');

function maskPiiValue(value, type) {
  if (!value) return null;
  
  switch (type) {
    case 'ssn':
      return `***-**-${value.slice(-4)}`;
    case 'creditCard':
      return `****-****-****-${value.slice(-4)}`;
    case 'email':
      const [local, domain] = value.split('@');
      return `${local[0]}***@${domain}`;
    case 'phone':
      return `***-***-${value.slice(-4)}`;
    case 'bankAccount':
      return `****${value.slice(-4)}`;
    default:
      return value.length > 4 ? `***${value.slice(-4)}` : '****';
  }
}

async function createFinding(data) {
  const prisma = getPrismaClient();
  
  return prisma.finding.create({
    data: {
      gmailAccountId: data.gmailAccountId,
      emailId: data.emailId,
      status: 'NEW',
      severity: data.severity || 'MEDIUM',
      riskScore: data.riskScore || 0,
      piiType: data.piiType,
      piiCategory: data.piiCategory || 'PII',
      description: data.description,
      matchCount: data.matchCount || 1,
      confidence: data.confidence || 0,
      mlEnhanced: data.mlEnhanced || false,
      detectionMethod: data.detectionMethod || 'rule-based',
      redactedValue: maskPiiValue(data.value, data.piiType),
      context: data.context,
    },
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          from: true,
          receivedAt: true,
        }
      }
    }
  });
}

async function getFindings({ 
  gmailAccountId, 
  status, 
  severity, 
  piiType,
  startDate,
  endDate,
  page = 1, 
  limit = 20 
}) {
  const prisma = getPrismaClient();
  
  const where = {};
  if (gmailAccountId) where.gmailAccountId = gmailAccountId;
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (piiType) where.piiType = piiType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      include: {
        email: {
          select: {
            id: true,
            subject: true,
            from: true,
            to: true,
            receivedAt: true,
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.finding.count({ where })
  ]);

  return {
    findings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getFindingById(id) {
  const prisma = getPrismaClient();
  
  return prisma.finding.findUnique({
    where: { id },
    include: {
      email: true,
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      feedbacks: true,
    }
  });
}

async function updateFindingStatus(id, { status, reviewedById, reviewNotes, falsePositive }) {
  const prisma = getPrismaClient();
  
  const data = { status, updatedAt: new Date() };
  if (reviewedById) {
    data.reviewedById = reviewedById;
    data.reviewedAt = new Date();
  }
  if (reviewNotes !== undefined) data.reviewNotes = reviewNotes;
  if (falsePositive !== undefined) data.falsePositive = falsePositive;
  
  return prisma.finding.update({
    where: { id },
    data,
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          from: true,
        }
      }
    }
  });
}

async function bulkUpdateFindings(ids, { status, reviewedById }) {
  const prisma = getPrismaClient();
  
  return prisma.finding.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      reviewedById,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }
  });
}

async function getStatistics(gmailAccountId, days = 7) {
  const prisma = getPrismaClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const where = { createdAt: { gte: startDate } };
  if (gmailAccountId) where.gmailAccountId = gmailAccountId;
  
  const [
    total,
    bySeverity,
    byStatus,
    byPiiType,
    recentFindings
  ] = await Promise.all([
    prisma.finding.count({ where }),
    prisma.finding.groupBy({
      by: ['severity'],
      where,
      _count: true,
    }),
    prisma.finding.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.finding.groupBy({
      by: ['piiType'],
      where,
      _count: true,
    }),
    prisma.finding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        piiType: true,
        severity: true,
        status: true,
        createdAt: true,
      }
    })
  ]);

  return {
    total,
    bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s.severity]: s._count }), {}),
    byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
    byPiiType: byPiiType.reduce((acc, s) => ({ ...acc, [s.piiType]: s._count }), {}),
    recentFindings,
    period: { days, startDate },
  };
}

async function addFeedback(findingId, { isCorrect, correctType, notes, createdById }) {
  const prisma = getPrismaClient();
  
  return prisma.feedback.create({
    data: {
      findingId,
      isCorrect,
      correctType,
      notes,
      createdById,
    }
  });
}

module.exports = {
  createFinding,
  getFindings,
  getFindingById,
  updateFindingStatus,
  bulkUpdateFindings,
  getStatistics,
  addFeedback,
  maskPiiValue,
};
