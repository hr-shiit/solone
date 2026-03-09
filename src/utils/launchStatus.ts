import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum LaunchStatus {
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING',
  ENDED = 'ENDED',
  SOLD_OUT = 'SOLD_OUT'
}

export interface LaunchData {
  totalSupply: number;
  startsAt: Date;
  endsAt: Date;
}

export function computeLaunchStatus(
  launch: LaunchData,
  totalPurchased: number,
  currentTime: Date
): LaunchStatus {
  // Priority order: SOLD_OUT > UPCOMING > ENDED > ACTIVE
  if (totalPurchased >= launch.totalSupply) {
    return LaunchStatus.SOLD_OUT;
  }
  
  if (currentTime < launch.startsAt) {
    return LaunchStatus.UPCOMING;
  }
  
  if (currentTime > launch.endsAt) {
    return LaunchStatus.ENDED;
  }
  
  return LaunchStatus.ACTIVE;
}

export async function getTotalPurchased(
  launchId: string,
  prismaClient = prisma
): Promise<number> {
  const result = await prismaClient.purchase.aggregate({
    where: { launchId },
    _sum: { amount: true }
  });
  
  return result._sum.amount || 0;
}
