import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isLaunchCreator(
  userId: string,
  launchId: string
): Promise<boolean> {
  const launch = await prisma.launch.findUnique({
    where: { id: launchId },
    select: { creatorId: true }
  });

  return launch?.creatorId === userId;
}
