import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function applyReferralDiscount(
  totalCost: number,
  discountPercent: number
): number {
  const discountAmount = totalCost * (discountPercent / 100);
  return totalCost - discountAmount;
}

export async function processReferralCode(
  launchId: string,
  code: string,
  totalCost: number,
  prismaClient = prisma
): Promise<{ finalCost: number; referralCodeId: string }> {
  const referralCode = await prismaClient.referralCode.findUnique({
    where: { launchId_code: { launchId, code } }
  });
  
  if (!referralCode) {
    throw new Error('Invalid referral code');
  }
  
  if (referralCode.usedCount >= referralCode.maxUses) {
    throw new Error('Referral code usage limit reached');
  }
  
  const finalCost = applyReferralDiscount(totalCost, referralCode.discountPercent);
  
  await prismaClient.referralCode.update({
    where: { id: referralCode.id },
    data: { usedCount: { increment: 1 } }
  });
  
  return { finalCost, referralCodeId: referralCode.id };
}
