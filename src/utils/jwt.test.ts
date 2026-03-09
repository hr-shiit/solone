import { generateToken, verifyToken, JWTPayload } from './jwt';

describe('JWT Utilities', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with userId and email', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should throw error if JWT_SECRET is not defined', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      expect(() => generateToken(payload)).toThrow('JWT_SECRET environment variable is not defined');

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for token signed with different secret', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      const token = generateToken(payload);

      // Change the secret
      process.env.JWT_SECRET = 'different-secret';

      expect(() => verifyToken(token)).toThrow('Invalid or expired token');

      // Restore original secret
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
    });

    it('should throw error if JWT_SECRET is not defined', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      const token = generateToken(payload);

      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => verifyToken(token)).toThrow('JWT_SECRET environment variable is not defined');

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain payload integrity through generate and verify cycle', () => {
      const payload: JWTPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com'
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should handle different payloads correctly', () => {
      const payloads: JWTPayload[] = [
        { userId: 'user-1', email: 'user1@test.com' },
        { userId: 'user-2', email: 'user2@test.com' },
        { userId: 'user-3', email: 'user3@test.com' }
      ];

      payloads.forEach(payload => {
        const token = generateToken(payload);
        const decoded = verifyToken(token);

        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.email).toBe(payload.email);
      });
    });
  });
});
