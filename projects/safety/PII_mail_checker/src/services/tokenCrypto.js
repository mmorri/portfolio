// AES-256-GCM token encryption for OAuth tokens at rest.
// Dependency-free apart from node:crypto so it can be unit tested.
// `key` must be a 32-byte Buffer. Values that do not carry the `gcm:`
// prefix are returned unchanged (legacy plaintext rows).
const crypto = require('crypto');

function encryptToken(plain, key) {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `gcm:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

function decryptToken(stored, key) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('gcm:')) return stored;
  const parts = stored.split(':');
  if (parts.length !== 4) return stored;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'hex'));
  decipher.setAuthTag(Buffer.from(parts[2], 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[3], 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function resolveTokenKey(hexFromEnv, devFallbackSecret) {
  if (/^[0-9a-fA-F]{64}$/.test(hexFromEnv || '')) {
    return Buffer.from(hexFromEnv, 'hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-hex-char key in production');
  }
  return crypto.createHash('sha256').update(`dev-tokens:${devFallbackSecret}`).digest();
}

module.exports = { encryptToken, decryptToken, resolveTokenKey };
