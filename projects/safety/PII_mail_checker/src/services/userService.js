const bcrypt = require('bcryptjs');
const { getPrismaClient } = require('../config/database');
const config = require('../config');

async function createUser({ email, password, name, role = 'ANALYST' }) {
  const prisma = getPrismaClient();
  const passwordHash = password ? await bcrypt.hash(password, config.bcryptRounds) : null;
  
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    }
  });
}

async function findUserByEmail(email) {
  const prisma = getPrismaClient();
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
}

async function findUserById(id) {
  const prisma = getPrismaClient();
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    }
  });
}

async function validatePassword(user, password) {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

async function updateLastLogin(userId) {
  const prisma = getPrismaClient();
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  });
}

async function updateUser(id, data) {
  const prisma = getPrismaClient();
  const updateData = { ...data };
  
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
    delete updateData.password;
  }
  
  if (data.email) {
    updateData.email = data.email.toLowerCase();
  }
  
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    }
  });
}

async function getAllUsers() {
  const prisma = getPrismaClient();
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function deleteUser(id) {
  const prisma = getPrismaClient();
  return prisma.user.delete({ where: { id } });
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  validatePassword,
  updateLastLogin,
  updateUser,
  getAllUsers,
  deleteUser,
};
