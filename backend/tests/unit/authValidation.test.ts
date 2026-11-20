import { loginSchema, registerSchema } from '../../src/validators/authValidators';

describe('Authentication validation', () => {
  describe('registerSchema', () => {
    it('accepts a valid applicant registration payload', () => {
      const parsed = registerSchema.parse({
        name: 'Ada Lovelace',
        email: 'Ada@Example.TEST',
        password: 'SecurePass1',
      });

      expect(parsed.email).toBe('ada@example.test');
      expect(parsed.name).toBe('Ada Lovelace');
    });

    it('rejects weak passwords', () => {
      const result = registerSchema.safeParse({
        name: 'Weak User',
        email: 'weak@example.test',
        password: 'weak',
      });

      expect(result.success).toBe(false);
    });

    it('rejects passwords without an uppercase letter', () => {
      const result = registerSchema.safeParse({
        name: 'No Upper',
        email: 'noupper@example.test',
        password: 'securepass1',
      });

      expect(result.success).toBe(false);
    });

    it('rejects passwords without a number', () => {
      const result = registerSchema.safeParse({
        name: 'No Number',
        email: 'nonumber@example.test',
        password: 'SecurePass',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid emails', () => {
      const result = registerSchema.safeParse({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'SecurePass1',
      });

      expect(result.success).toBe(false);
    });

    it('rejects client-supplied role fields (strict schema)', () => {
      const result = registerSchema.safeParse({
        name: 'Role Hacker',
        email: 'hacker@example.test',
        password: 'SecurePass1',
        role: 'ADMIN',
      });

      expect(result.success).toBe(false);
    });

    it('rejects short names', () => {
      const result = registerSchema.safeParse({
        name: 'A',
        email: 'short@example.test',
        password: 'SecurePass1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts a valid login payload and lowercases email', () => {
      const parsed = loginSchema.parse({
        email: 'Reviewer@Example.TEST',
        password: 'anything',
      });

      expect(parsed.email).toBe('reviewer@example.test');
    });

    it('rejects empty passwords', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.test',
        password: '',
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.test',
        password: 'SecurePass1',
        role: 'ADMIN',
      });

      expect(result.success).toBe(false);
    });
  });
});
