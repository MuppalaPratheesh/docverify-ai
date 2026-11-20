import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('Password hashing and comparison', () => {
  it('hashes a password into a bcrypt digest that is not the plaintext', async () => {
    const plain = 'SecurePass1';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies the correct password against its hash', async () => {
    const plain = 'SecurePass1';
    const hash = await hashPassword(plain);

    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('SecurePass1');

    await expect(verifyPassword('WrongPass9', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const first = await hashPassword('SecurePass1');
    const second = await hashPassword('SecurePass1');

    expect(first).not.toBe(second);
    await expect(verifyPassword('SecurePass1', first)).resolves.toBe(true);
    await expect(verifyPassword('SecurePass1', second)).resolves.toBe(true);
  });
});
