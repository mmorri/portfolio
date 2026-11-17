// Pure OAuth `state` helpers: the state parameter must be a server-signed
// userId token, never a raw userId (prevents account-linking confusion).
// Dependency-free so it can be unit tested without provider SDKs.
const crypto = require('crypto');

function signState(userId, secret) {
  if (typeof userId !== 'string' || !userId) {
    throw new Error('userId must be a non-empty string');
  }
  const sig = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

function verifyState(state, secret) {
  if (typeof state !== 'string' || typeof secret !== 'string' || !secret) {
    return null;
  }
  const idx = state.indexOf('.');
  if (idx < 1) return null;
  const userId = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

module.exports = { signState, verifyState };
