const crypto = require('crypto');
const { encryptToken, decryptToken, resolveTokenKey } = require('../../src/services/tokenCrypto');

describe('tokenCrypto', () => {
  const key = crypto.randomBytes(32);

  test('encrypt/decrypt round-trips the token', () => {
    const cipher = encryptToken('ya29.secret-token', key);
    expect(cipher).not.toBe('ya29.secret-token');
    expect(decryptToken(cipher, key)).toBe('ya29.secret-token');
  });

  test('same plaintext encrypts differently each time (random IV)', () => {
    expect(encryptToken('abc', key)).not.toBe(encryptToken('abc', key));
  });

  test('legacy plaintext rows pass through undecrypted', () => {
    expect(decryptToken('ya29.plain', key)).toBe('ya29.plain');
    expect(decryptToken('', key)).toBe('');
    expect(decryptToken(null, key)).toBeNull();
  });

  test('tampered ciphertext fails authentication', () => {
    const cipher = encryptToken('abc', key);
    const tampered = cipher.slice(0, -1) + (cipher.endsWith('0') ? '1' : '0');
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  test('wrong key fails authentication', () => {
    const cipher = encryptToken('abc', key);
    expect(() => decryptToken(cipher, crypto.randomBytes(32))).toThrow();
  });

  test('production requires an explicit 64-hex-char key', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => resolveTokenKey('', 'fallback')).toThrow();
      expect(resolveTokenKey(crypto.randomBytes(32).toString('hex'), 'fallback')).toHaveLength(32);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
