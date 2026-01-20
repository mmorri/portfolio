const { google } = require('googleapis');
const { getPrismaClient } = require('../config/database');
const config = require('../config');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId,
  });
}

async function handleOAuthCallback(code, userId) {
  const oauth2Client = createOAuth2Client();
  const prisma = getPrismaClient();
  
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();
  
  const gmailAccount = await prisma.gmailAccount.upsert({
    where: {
      userId_email: {
        userId,
        email: userInfo.email,
      }
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      email: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
    }
  });
  
  return gmailAccount;
}

async function getGmailAccounts(userId) {
  const prisma = getPrismaClient();
  
  return prisma.gmailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      email: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function disconnectGmailAccount(userId, accountId) {
  const prisma = getPrismaClient();
  
  const account = await prisma.gmailAccount.findFirst({
    where: { id: accountId, userId }
  });
  
  if (!account) {
    throw new Error('Gmail account not found');
  }
  
  await prisma.gmailAccount.update({
    where: { id: accountId },
    data: { isActive: false }
  });
  
  return { success: true };
}

async function getGmailClient(gmailAccountId) {
  const prisma = getPrismaClient();
  
  const account = await prisma.gmailAccount.findUnique({
    where: { id: gmailAccountId }
  });
  
  if (!account || !account.isActive) {
    throw new Error('Gmail account not found or inactive');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });
  
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.gmailAccount.update({
      where: { id: gmailAccountId },
      data: {
        accessToken: tokens.access_token,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      }
    });
  });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function scanRecentEmails(gmailAccountId, maxResults = 10) {
  const gmail = await getGmailClient(gmailAccountId);
  const prisma = getPrismaClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:inbox',
  });
  
  if (!response.data.messages) {
    return [];
  }
  
  const emails = [];
  
  for (const message of response.data.messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full',
    });
    
    const headers = fullMessage.data.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    
    let body = '';
    const parts = fullMessage.data.payload.parts || [fullMessage.data.payload];
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    
    emails.push({
      gmailMessageId: message.id,
      threadId: fullMessage.data.threadId,
      from,
      to: [to],
      subject,
      body,
      receivedAt: new Date(date),
    });
  }
  
  await prisma.gmailAccount.update({
    where: { id: gmailAccountId },
    data: { lastSyncAt: new Date() }
  });
  
  return emails;
}

function isConfigured() {
  return !!(config.googleClientId && config.googleClientSecret);
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getGmailAccounts,
  disconnectGmailAccount,
  scanRecentEmails,
  isConfigured,
};
