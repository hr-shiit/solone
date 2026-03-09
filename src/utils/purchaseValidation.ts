import { PrismaClient } from '@prisma/client';
import { computeLaunchStatus, LaunchStatus } from './launchStatus';

const prisma = new PrismaClient();

export interface PurchaseValidation {
  valid: boolean;
  error?: string;
}

export async function validatePurchase(
  userId: string,
  launchId: string,
  walletAddress: string,
  amount: number,
  txSignature: string,
  prismaClient = prisma
): Promise<PurchaseValidation> {
  const launch = await prismaClient.launch.findUnique({
    where: { id: launchId },
    include: {
      whitelist: true,
      purchases: true
    }
  });
  
  if (!launch) {
    return { valid: false, error: 'Launch not found' };
  }
  
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
  
  if (status !== LaunchStatus.ACTIVE) {
    return { valid: false, error: `Launch is ${status}` };
  }
  
  if (launch.whitelist.length > 0) {
    const isWhitelisted = launch.whitelist.some(w => w.address === walletAddress);
    if (!isWhitelisted) {
      return { valid: false, error: 'Wallet not whitelisted' };
    }
  }
  
  const userPurchases = launch.purchases
    .filter(p => p.userId === userId)
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (userPurchases + amount > launch.maxPerWallet) {
    return { valid: false, error: 'Exceeds max per wallet' };
  }
  
  if (totalPurchased + amount > launch.totalSupply) {
    return { valid: false, error: 'Exceeds total supply' };
  }
  
  const duplicateTx = launch.purchases.some(p => p.txSignature === txSignature);
  if (duplicateTx) {
    return { valid: false, error: 'Transaction signature already used' };
  }
  
  return { valid: true };
}
