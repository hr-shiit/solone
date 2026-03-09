import { Request, Response } from 'express';
import { registerHandler, loginHandler } from './auth';
import * as passwordUtils from '../utils/password';
import * as jwtUtils from '../utils/jwt';

// Mock dependencies
jest.mock('../utils/password');
jest.mock('../utils/jwt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
};

describe('POST /api/auth/register', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should return 400 when email is missing', async () => {
    mockRequest.body = { password: 'password123', name: 'John Doe' };

    await registerHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email, password, and name are required'
    });
  });

  it('should return 400 when password is missing', async () => {
    mockRequest.body = { email: 'test@example.com', name: 'John Doe' };

    await registerHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email, password, and name are required'
    });
  });

  it('should return 400 when name is missing', async () => {
    mockRequest.body = { email: 'test@example.com', password: 'password123' };

    await registerHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email, password, and name are required'
    });
  });

  it('should return 409 when email already exists', async () => {
    mockRequest.body = {
      email: 'existing@example.com',
      password: 'password123',
      name: 'John Doe'
    };

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'existing@example.com',
      password: 'hashed',
      name: 'Existing User',
      createdAt: new Date()
    });

    await registerHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Email already exists'
    });
  });

  it('should return 201 with token and user object when registration is successful', async () => {
    const mockUser = {
      id: 'new-user-id',
      email: 'newuser@example.com',
      password: 'hashed-password',
      name: 'New User',
      createdAt: new Date()
    };

    mockRequest.body = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User'
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (jwtUtils.generateToken as jest.Mock).mockReturnValue('mock-jwt-token');

    await registerHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(passwordUtils.hashPassword).toHaveBeenCalledWith('password123');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'newuser@example.com',
        password: 'hashed-password',
        name: 'New User'
      }
    });
    expect(jwtUtils.generateToken).toHaveBeenCalledWith({
      userId: 'new-user-id',
      email: 'newuser@example.com'
    });
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      token: 'mock-jwt-token',
      user: {
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User'
      }
    });
  });
});

describe('POST /api/auth/login', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should return 400 when email is missing', async () => {
    mockRequest.body = { password: 'password123' };

    await loginHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email and password are required'
    });
  });

  it('should return 400 when password is missing', async () => {
    mockRequest.body = { email: 'test@example.com' };

    await loginHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields: email and password are required'
    });
  });

  it('should return 401 when user does not exist', async () => {
    mockRequest.body = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await loginHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@example.com' }
    });
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid credentials'
    });
  });

  it('should return 401 when password is invalid', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      createdAt: new Date()
    };

    mockRequest.body = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

    await loginHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(passwordUtils.comparePassword).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid credentials'
    });
  });

  it('should return 200 with token and user object when login is successful', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      createdAt: new Date()
    };

    mockRequest.body = {
      email: 'test@example.com',
      password: 'correctpassword'
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
    (jwtUtils.generateToken as jest.Mock).mockReturnValue('mock-jwt-token');

    await loginHandler(mockRequest as Request, mockResponse as Response, mockPrisma as any);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' }
    });
    expect(passwordUtils.comparePassword).toHaveBeenCalledWith('correctpassword', 'hashed-password');
    expect(jwtUtils.generateToken).toHaveBeenCalledWith({
      userId: 'user-id',
      email: 'test@example.com'
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      token: 'mock-jwt-token',
      user: {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    });
  });
});
