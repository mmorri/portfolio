const { getPrismaClient } = require('../config/database');

const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  VIEW_FINDING: 'VIEW_FINDING',
  UPDATE_FINDING: 'UPDATE_FINDING',
  RESOLVE_FINDING: 'RESOLVE_FINDING',
  VIEW_EMAIL_CONTENT: 'VIEW_EMAIL_CONTENT',
  CONNECT_GMAIL: 'CONNECT_GMAIL',
  DISCONNECT_GMAIL: 'DISCONNECT_GMAIL',
  UPDATE_POLICY: 'UPDATE_POLICY',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
};

async function log({ userId, action, resource, resourceId, details, req }) {
  const prisma = getPrismaClient();
  
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('user-agent'),
    }
  });
}

async function getAuditLogs({ 
  userId, 
  action, 
  resource,
  startDate, 
  endDate, 
  page = 1, 
  limit = 50 
}) {
  const prisma = getPrismaClient();
  
  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  AUDIT_ACTIONS,
  log,
  getAuditLogs,
};
