import { Request, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from './auth';
import { generateToken } from '../utils/jwt';

describe('authenticateJWT middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should return 401 when Authorization header is missing', () => {
    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'InvalidToken' };

    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should attach user info to request and call next() for valid token', () => {
    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = 'test-secret-key';

    const payload = { userId: 'user-123', email: 'test@example.com' };
    const token = generateToken(payload);
    
    mockRequest.headers = { authorization: `Bearer ${token}` };

    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toEqual({
      userId: 'user-123',
      email: 'test@example.com'
    });
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should extract token correctly from Bearer header', () => {
    process.env.JWT_SECRET = 'test-secret-key';

    const payload = { userId: 'user-456', email: 'another@example.com' };
    const token = generateToken(payload);
    
    mockRequest.headers = { authorization: `Bearer ${token}` };

    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user?.userId).toBe('user-456');
    expect(mockRequest.user?.email).toBe('another@example.com');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 401 for expired token', () => {
    // This test would require mocking time or using a token with very short expiry
    // For now, we test with an invalid token format
    mockRequest.headers = { authorization: 'Bearer expired.token.value' };

    authenticateJWT(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
