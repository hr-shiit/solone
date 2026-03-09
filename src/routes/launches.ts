import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { computeLaunchStatus, getTotalPurchased } from '../utils/launchStatus';
import { isLaunchCreator } from '../utils/authorization';
import { calculateTieredCost } from '../utils/pricing';
import { processReferralCode } from '../utils/referral';
import { validatePurchase } from '../utils/purchaseValidation';
import { calculateVesting } from '../utils/vesting';

const router = Router();
const prisma = new PrismaClient();

export const createLaunchHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const {
      name,
      symbol,
      totalSupply,
      pricePerToken,
      startsAt,
      endsAt,
      maxPerWallet,
      description,
      tiers,
      vesting
    } = req.body;

    if (!name || !symbol || !totalSupply || !pricePerToken || !startsAt || !endsAt || !maxPerWallet || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = req.user!.userId;

    const launch = await prismaClient.launch.create({
      data: {
        name,
        symbol,
        totalSupply: parseFloat(totalSupply),
        pricePerToken: parseFloat(pricePerToken),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        maxPerWallet: parseFloat(maxPerWallet),
        description,
        creatorId: userId,
        tiers: tiers ? {
          create: tiers.map((tier: any) => ({
            minAmount: parseFloat(tier.minAmount),
            maxAmount: parseFloat(tier.maxAmount),
            pricePerToken: parseFloat(tier.pricePerToken)
          }))
        } : undefined,
        vestingSchedule: vesting ? {
          create: {
            tgePercent: parseFloat(vesting.tgePercent),
            cliffDays: parseInt(vesting.cliffDays),
            vestingDays: parseInt(vesting.vestingDays)
          }
        } : undefined
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

    const totalPurchased = await getTotalPurchased(launch.id, prismaClient);
    const status = computeLaunchStatus(
      {
        totalSupply: launch.totalSupply,
        startsAt: launch.startsAt,
        endsAt: launch.endsAt
      },
      totalPurchased,
      new Date()
    );

    return res.status(201).json({
      ...launch,
      status
    });
  } catch (error) {
    console.error('Error creating launch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const listLaunchesHandler = async (
  req: any,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statusFilter = req.query.status as string | undefined;

    const skip = (page - 1) * limit;

    const launches = await prismaClient.launch.findMany({
      skip,
      take: limit,
      include: {
        tiers: true,
        vestingSchedule: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        purchases: {
          select: {
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const launchesWithStatus = await Promise.all(
      launches.map(async (launch) => {
        const totalPurchased = launch.purchases.reduce((sum, p) => sum + p.amount, 0);
        const status = computeLaunchStatus(
          {
            totalSupply: launch.totalSupply,
            startsAt: launch.startsAt,
            endsAt: launch.endsAt
          },
          totalPurchased,
          new Date()
        );

        const { purchases, ...launchData } = launch;
        return {
          ...launchData,
          status
        };
      })
    );

    const filteredLaunches = statusFilter
      ? launchesWithStatus.filter(l => l.status === statusFilter)
      : launchesWithStatus;

    const total = await prismaClient.launch.count();

    return res.status(200).json({
      launches: filteredLaunches,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error listing launches:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSingleLaunchHandler = async (
  req: any,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;

    const launch = await prismaClient.launch.findUnique({
      where: { id: id as string },
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

    if (!launch) {
      return res.status(404).json({ error: 'Launch not found' });
    }

    const totalPurchased = await getTotalPurchased(id as string, prismaClient);
    const status = computeLaunchStatus(
      {
        totalSupply: launch.totalSupply,
        startsAt: launch.startsAt,
        endsAt: launch.endsAt
      },
      totalPurchased,
      new Date()
    );

    return res.status(200).json({
      ...launch,
      status
    });
  } catch (error) {
    console.error('Error fetching launch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLaunchHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existingLaunch = await prismaClient.launch.findUnique({
      where: { id: id as string }
    });

    if (!existingLaunch) {
      return res.status(404).json({ error: 'Launch not found' });
    }

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can update this launch' });
    }

    const updatedLaunch = await prismaClient.launch.update({
      where: { id: id as string },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.symbol && { symbol: req.body.symbol }),
        ...(req.body.description && { description: req.body.description }),
        ...(req.body.totalSupply && { totalSupply: parseFloat(req.body.totalSupply) }),
        ...(req.body.pricePerToken && { pricePerToken: parseFloat(req.body.pricePerToken) }),
        ...(req.body.startsAt && { startsAt: new Date(req.body.startsAt) }),
        ...(req.body.endsAt && { endsAt: new Date(req.body.endsAt) }),
        ...(req.body.maxPerWallet && { maxPerWallet: parseFloat(req.body.maxPerWallet) })
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

    const totalPurchased = await getTotalPurchased(id as string, prismaClient);
    const status = computeLaunchStatus(
      {
        totalSupply: updatedLaunch.totalSupply,
        startsAt: updatedLaunch.startsAt,
        endsAt: updatedLaunch.endsAt
      },
      totalPurchased,
      new Date()
    );

    return res.status(200).json({
      ...updatedLaunch,
      status
    });
  } catch (error) {
    console.error('Error updating launch:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addWhitelistHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const { addresses } = req.body;
    const userId = req.user!.userId;

    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ error: 'addresses array is required' });
    }

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can manage whitelist' });
    }

    const createData = addresses.map(address => ({
      launchId: id as string,
      address
    }));

    await prismaClient.whitelist.createMany({
      data: createData,
      skipDuplicates: true
    });

    const totalCount = await prismaClient.whitelist.count({
      where: { launchId: id as string }
    });

    return res.status(200).json({
      added: addresses.length,
      total: totalCount
    });
  } catch (error) {
    console.error('Error adding whitelist addresses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWhitelistHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can view whitelist' });
    }

    const whitelist = await prismaClient.whitelist.findMany({
      where: { launchId: id as string },
      select: {
        address: true
      }
    });

    const addresses = whitelist.map(w => w.address);

    return res.status(200).json({
      addresses,
      total: addresses.length
    });
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeWhitelistHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id, address } = req.params;
    const userId = req.user!.userId;

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can manage whitelist' });
    }

    const entry = await prismaClient.whitelist.findFirst({
      where: {
        launchId: id as string,
        address: address as string
      }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Address not found in whitelist' });
    }

    await prismaClient.whitelist.delete({
      where: { id: entry.id }
    });

    return res.status(200).json({ removed: true });
  } catch (error) {
    console.error('Error removing whitelist address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReferralCodeHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const { code, discountPercent, maxUses } = req.body;
    const userId = req.user!.userId;

    if (!code || discountPercent === undefined || !maxUses) {
      return res.status(400).json({ error: 'code, discountPercent, and maxUses are required' });
    }

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can create referral codes' });
    }

    const existing = await prismaClient.referralCode.findUnique({
      where: {
        launchId_code: {
          launchId: id as string,
          code
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Referral code already exists for this launch' });
    }

    const referralCode = await prismaClient.referralCode.create({
      data: {
        launchId: id as string,
        code,
        discountPercent: parseFloat(discountPercent),
        maxUses: parseInt(maxUses),
        usedCount: 0
      }
    });

    return res.status(201).json(referralCode);
  } catch (error) {
    console.error('Error creating referral code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReferralCodesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const isCreator = await isLaunchCreator(userId, id as string);
    if (!isCreator) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can view referral codes' });
    }

    const referralCodes = await prismaClient.referralCode.findMany({
      where: { launchId: id as string }
    });

    return res.status(200).json(referralCodes);
  } catch (error) {
    console.error('Error fetching referral codes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const purchaseTokensHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const { walletAddress, amount, txSignature, referralCode } = req.body;
    const userId = req.user!.userId;

    if (!walletAddress || !amount || !txSignature) {
      return res.status(400).json({ error: 'walletAddress, amount, and txSignature are required' });
    }

    const validation = await validatePurchase(
      userId,
      id as string,
      walletAddress,
      parseFloat(amount),
      txSignature,
      prismaClient
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const launch = await prismaClient.launch.findUnique({
      where: { id: id as string },
      include: { tiers: true }
    });

    if (!launch) {
      return res.status(404).json({ error: 'Launch not found' });
    }

    let totalCost = calculateTieredCost(
      parseFloat(amount),
      launch.tiers,
      launch.pricePerToken
    );

    if (referralCode) {
      try {
        const result = await processReferralCode(
          id as string,
          referralCode,
          totalCost,
          prismaClient
        );
        totalCost = result.finalCost;
      } catch (error: any) {
        return res.status(400).json({ error: error.message });
      }
    }

    const purchase = await prismaClient.purchase.create({
      data: {
        userId,
        launchId: id as string,
        walletAddress,
        amount: parseFloat(amount),
        totalCost,
        txSignature
      }
    });

    return res.status(201).json(purchase);
  } catch (error) {
    console.error('Error processing purchase:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPurchasesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const isCreator = await isLaunchCreator(userId, id as string);

    const purchases = await prismaClient.purchase.findMany({
      where: {
        launchId: id as string,
        ...(isCreator ? {} : { userId })
      },
      select: {
        id: true,
        userId: true,
        walletAddress: true,
        amount: true,
        totalCost: true,
        txSignature: true,
        purchasedAt: true
      }
    });

    return res.status(200).json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVestingHandler = async (
  req: any,
  res: Response,
  prismaClient = prisma
) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress query parameter is required' });
    }

    const launch = await prismaClient.launch.findUnique({
      where: { id: id as string },
      include: {
        vestingSchedule: true
      }
    });

    if (!launch) {
      return res.status(404).json({ error: 'Launch not found' });
    }

    const purchases = await prismaClient.purchase.findMany({
      where: {
        launchId: id as string,
        walletAddress: walletAddress as string
      }
    });

    const totalPurchased = purchases.reduce((sum, p) => sum + p.amount, 0);

    const vestingInfo = calculateVesting(
      totalPurchased,
      launch.vestingSchedule,
      launch.endsAt,
      new Date()
    );

    return res.status(200).json(vestingInfo);
  } catch (error) {
    console.error('Error calculating vesting:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/', (req, res) => listLaunchesHandler(req, res));
router.get('/:id', (req, res) => getSingleLaunchHandler(req, res));

router.post('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => 
  createLaunchHandler(req, res)
);

router.put('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  updateLaunchHandler(req, res)
);

router.post('/:id/whitelist', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  addWhitelistHandler(req, res)
);

router.get('/:id/whitelist', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  getWhitelistHandler(req, res)
);

router.delete('/:id/whitelist/:address', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  removeWhitelistHandler(req, res)
);

router.post('/:id/referrals', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  createReferralCodeHandler(req, res)
);

router.get('/:id/referrals', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  getReferralCodesHandler(req, res)
);

router.post('/:id/purchase', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  purchaseTokensHandler(req, res)
);

router.get('/:id/purchases', authenticateJWT, (req: AuthenticatedRequest, res: Response) =>
  getPurchasesHandler(req, res)
);

router.get('/:id/vesting', (req, res) => getVestingHandler(req, res));

export default router;
