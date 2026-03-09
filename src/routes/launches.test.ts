import { Response } from 'express';
import { createLaunchHandler } from './launches';
import { AuthenticatedRequest } from '../middleware/auth';
import * as launchStatusUtils from '../utils/launchStatus';

// Mock dependencies
jest.mock('../utils/launchStatus');

const mockPrisma = {
  launch: {
    create: jest.fn()
  },
  purchase: {
    aggregate: jest.fn()
  }
};

describe('POST /api/launches', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      body: {},
      user: {
        userId: 'test-user-id',
        email: 'test@example.com'
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should return 400 when name is missing', async () => {
    mockRequest.body = {
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when symbol is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when totalSupply is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when pricePerToken is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when startsAt is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when endsAt is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      maxPerWallet: 10000,
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when maxPerWallet is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      description: 'Test'
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should return 400 when description is missing', async () => {
    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      maxPerWallet: 10000
    };

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    });
  });

  it('should create a launch with required fields and return 201', async () => {
    const startsAt = new Date(Date.now() + 86400000);
    const endsAt = new Date(Date.now() + 86400000 * 7);
    
    const mockLaunch = {
      id: 'launch-id',
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt,
      endsAt,
      maxPerWallet: 10000,
      description: 'A test token launch',
      creatorId: 'test-user-id',
      createdAt: new Date(),
      tiers: [],
      vestingSchedule: null,
      creator: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRequest.body = {
      name: 'Test Token',
      symbol: 'TEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPerWallet: 10000,
      description: 'A test token launch'
    };

    mockPrisma.launch.create.mockResolvedValue(mockLaunch);
    (launchStatusUtils.getTotalPurchased as jest.Mock).mockResolvedValue(0);
    (launchStatusUtils.computeLaunchStatus as jest.Mock).mockReturnValue('UPCOMING');

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockPrisma.launch.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Token',
        symbol: 'TEST',
        totalSupply: 1000000,
        pricePerToken: 0.5,
        startsAt,
        endsAt,
        maxPerWallet: 10000,
        description: 'A test token launch',
        creatorId: 'test-user-id',
        tiers: undefined,
        vestingSchedule: undefined
      },
      include: {
        tiers: true,
        vestingSchedule: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...mockLaunch,
      status: 'UPCOMING'
    });
  });

  it('should create a launch with tiers and return 201', async () => {
    const startsAt = new Date(Date.now() + 86400000);
    const endsAt = new Date(Date.now() + 86400000 * 7);
    
    const mockLaunch = {
      id: 'launch-id',
      name: 'Tiered Token',
      symbol: 'TIER',
      totalSupply: 1000000,
      pricePerToken: 1.0,
      startsAt,
      endsAt,
      maxPerWallet: 10000,
      description: 'A token launch with tiers',
      creatorId: 'test-user-id',
      createdAt: new Date(),
      tiers: [
        { id: 'tier-1', minAmount: 0, maxAmount: 1000, pricePerToken: 0.8, launchId: 'launch-id' },
        { id: 'tier-2', minAmount: 1000, maxAmount: 5000, pricePerToken: 0.9, launchId: 'launch-id' }
      ],
      vestingSchedule: null,
      creator: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRequest.body = {
      name: 'Tiered Token',
      symbol: 'TIER',
      totalSupply: 1000000,
      pricePerToken: 1.0,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPerWallet: 10000,
      description: 'A token launch with tiers',
      tiers: [
        { minAmount: 0, maxAmount: 1000, pricePerToken: 0.8 },
        { minAmount: 1000, maxAmount: 5000, pricePerToken: 0.9 }
      ]
    };

    mockPrisma.launch.create.mockResolvedValue(mockLaunch);
    (launchStatusUtils.getTotalPurchased as jest.Mock).mockResolvedValue(0);
    (launchStatusUtils.computeLaunchStatus as jest.Mock).mockReturnValue('UPCOMING');

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockPrisma.launch.create).toHaveBeenCalledWith({
      data: {
        name: 'Tiered Token',
        symbol: 'TIER',
        totalSupply: 1000000,
        pricePerToken: 1.0,
        startsAt,
        endsAt,
        maxPerWallet: 10000,
        description: 'A token launch with tiers',
        creatorId: 'test-user-id',
        tiers: {
          create: [
            { minAmount: 0, maxAmount: 1000, pricePerToken: 0.8 },
            { minAmount: 1000, maxAmount: 5000, pricePerToken: 0.9 }
          ]
        },
        vestingSchedule: undefined
      },
      include: {
        tiers: true,
        vestingSchedule: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...mockLaunch,
      status: 'UPCOMING'
    });
  });

  it('should create a launch with vesting schedule and return 201', async () => {
    const startsAt = new Date(Date.now() + 86400000);
    const endsAt = new Date(Date.now() + 86400000 * 7);
    
    const mockLaunch = {
      id: 'launch-id',
      name: 'Vested Token',
      symbol: 'VEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt,
      endsAt,
      maxPerWallet: 10000,
      description: 'A token launch with vesting',
      creatorId: 'test-user-id',
      createdAt: new Date(),
      tiers: [],
      vestingSchedule: {
        id: 'vesting-id',
        tgePercent: 20,
        cliffDays: 30,
        vestingDays: 180,
        launchId: 'launch-id'
      },
      creator: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRequest.body = {
      name: 'Vested Token',
      symbol: 'VEST',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPerWallet: 10000,
      description: 'A token launch with vesting',
      vesting: {
        tgePercent: 20,
        cliffDays: 30,
        vestingDays: 180
      }
    };

    mockPrisma.launch.create.mockResolvedValue(mockLaunch);
    (launchStatusUtils.getTotalPurchased as jest.Mock).mockResolvedValue(0);
    (launchStatusUtils.computeLaunchStatus as jest.Mock).mockReturnValue('UPCOMING');

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockPrisma.launch.create).toHaveBeenCalledWith({
      data: {
        name: 'Vested Token',
        symbol: 'VEST',
        totalSupply: 1000000,
        pricePerToken: 0.5,
        startsAt,
        endsAt,
        maxPerWallet: 10000,
        description: 'A token launch with vesting',
        creatorId: 'test-user-id',
        tiers: undefined,
        vestingSchedule: {
          create: {
            tgePercent: 20,
            cliffDays: 30,
            vestingDays: 180
          }
        }
      },
      include: {
        tiers: true,
        vestingSchedule: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...mockLaunch,
      status: 'UPCOMING'
    });
  });

  it('should assign authenticated user as creator', async () => {
    const startsAt = new Date(Date.now() + 86400000);
    const endsAt = new Date(Date.now() + 86400000 * 7);
    
    const mockLaunch = {
      id: 'launch-id',
      name: 'Creator Test Token',
      symbol: 'CTT',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt,
      endsAt,
      maxPerWallet: 10000,
      description: 'Testing creator assignment',
      creatorId: 'test-user-id',
      createdAt: new Date(),
      tiers: [],
      vestingSchedule: null,
      creator: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRequest.body = {
      name: 'Creator Test Token',
      symbol: 'CTT',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPerWallet: 10000,
      description: 'Testing creator assignment'
    };

    mockPrisma.launch.create.mockResolvedValue(mockLaunch);
    (launchStatusUtils.getTotalPurchased as jest.Mock).mockResolvedValue(0);
    (launchStatusUtils.computeLaunchStatus as jest.Mock).mockReturnValue('UPCOMING');

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(mockPrisma.launch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creatorId: 'test-user-id'
        })
      })
    );

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseData.creatorId).toBe('test-user-id');
    expect(responseData.creator.id).toBe('test-user-id');
  });

  it('should compute and include status in response', async () => {
    const startsAt = new Date(Date.now() - 86400000); // Started yesterday
    const endsAt = new Date(Date.now() + 86400000 * 7); // Ends in 7 days
    
    const mockLaunch = {
      id: 'launch-id',
      name: 'Status Test Token',
      symbol: 'STT',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt,
      endsAt,
      maxPerWallet: 10000,
      description: 'Testing status computation',
      creatorId: 'test-user-id',
      createdAt: new Date(),
      tiers: [],
      vestingSchedule: null,
      creator: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRequest.body = {
      name: 'Status Test Token',
      symbol: 'STT',
      totalSupply: 1000000,
      pricePerToken: 0.5,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      maxPerWallet: 10000,
      description: 'Testing status computation'
    };

    mockPrisma.launch.create.mockResolvedValue(mockLaunch);
    (launchStatusUtils.getTotalPurchased as jest.Mock).mockResolvedValue(0);
    (launchStatusUtils.computeLaunchStatus as jest.Mock).mockReturnValue('ACTIVE');

    await createLaunchHandler(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockPrisma as any
    );

    expect(launchStatusUtils.getTotalPurchased).toHaveBeenCalledWith('launch-id', mockPrisma);
    expect(launchStatusUtils.computeLaunchStatus).toHaveBeenCalledWith(
      {
        totalSupply: 1000000,
        startsAt,
        endsAt
      },
      0,
      expect.any(Date)
    );

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseData.status).toBe('ACTIVE');
  });
});
