const { signState, verifyState } = require('../../src/services/oauthState');

const SECRET = 'test-session-secret-for-unit-tests';

describe('oauthState', () => {
  test('signed state verifies back to the same userId', () => {
    expect(verifyState(signState('user123', SECRET), SECRET)).toBe('user123');
  });

  test('forged state for another user is rejected', () => {
    const victim = signState('victim', SECRET);
    const forged = `attacker.${victim.split('.')[1]}`;
    expect(verifyState(forged, SECRET)).toBeNull();
  });

  test('raw userId without a signature is rejected', () => {
    expect(verifyState('attacker', SECRET)).toBeNull();
  });

  test('state signed with a different secret is rejected', () => {
    expect(verifyState(signState('user123', 'wrong-secret'), SECRET)).toBeNull();
  });

  test('non-string and empty states are rejected', () => {
    expect(verifyState('', SECRET)).toBeNull();
    expect(verifyState(null, SECRET)).toBeNull();
    expect(verifyState(undefined, SECRET)).toBeNull();
    expect(verifyState(42, SECRET)).toBeNull();
  });

  test('empty userId cannot be signed', () => {
    expect(() => signState('', SECRET)).toThrow();
  });
});
