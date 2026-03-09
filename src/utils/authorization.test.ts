import { isLaunchCreator } from './authorization';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    launch: {
      findUnique: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const mockPrisma = prisma as jest.Mocked<PrismaClient>;

describe('Authorization Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isLaunchCreator', () => {
    it('should return true when user is the creator of the launch', async () => {
      const userId = 'user-123';
      const launchId = 'launch-456';

      (mockPrisma.launch.findUnique as jest.Mock).mockResolvedValue({
        id: launchId,
        creatorId: userId
      });

      const result = await isLaunchCreator(userId, launchId);

      expect(result).toBe(true);
      expect(mockPrisma.launch.findUnique).toHaveBeenCalledWith({
        where: { id: launchId },
        select: { creatorId: true }
      });
    });

    it('should return false when user is not the creator of the launch', async () => {
      const userId = 'user-123';
      const otherUserId = 'user-789';
      const launchId = 'launch-456';

      (mockPrisma.launch.findUnique as jest.Mock).mockResolvedValue({
        id: launchId,
        creatorId: otherUserId
      });

      const result = await isLaunchCreator(userId, launchId);

      expect(result).toBe(false);
      expect(mockPrisma.launch.findUnique).toHaveBeenCalledWith({
        where: { id: launchId },
        select: { creatorId: true }
      });
    });

    it('should return false when launch does not exist', async () => {
      const userId = 'user-123';
      const launchId = 'non-existent-launch';

      (mockPrisma.launch.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isLaunchCreator(userId, launchId);

      expect(result).toBe(false);
      expect(mockPrisma.launch.findUnique).toHaveBeenCalledWith({
        where: { id: launchId },
        select: { creatorId: true }
      });
    });

    it('should return false when user ID does not match creator ID', async () => {
      const userId = 'user-123';
      const creatorId = 'creator-999';
      const launchId = 'launch-456';

      (mockPrisma.launch.findUnique as jest.Mock).mockResolvedValue({
        id: launchId,
        creatorId: creatorId
      });

      const result = await isLaunchCreator(userId, launchId);

      expect(result).toBe(false);
    });

    it('should handle undefined creatorId gracefully', async () => {
      const userId = 'user-123';
      const launchId = 'launch-456';

      (mockPrisma.launch.findUnique as jest.Mock).mockResolvedValue({
        id: launchId,
        creatorId: undefined
      });

      const result = await isLaunchCreator(userId, launchId);

      expect(result).toBe(false);
    });
  });
});
