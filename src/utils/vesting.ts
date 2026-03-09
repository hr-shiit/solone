export interface VestingSchedule {
  tgePercent: number;
  cliffDays: number;
  vestingDays: number;
}

export interface VestingInfo {
  totalPurchased: number;
  tgeAmount: number;
  vestedAmount: number;
  lockedAmount: number;
  claimableAmount: number;
}

export function calculateVesting(
  totalPurchased: number,
  vestingSchedule: VestingSchedule | null,
  launchEndsAt: Date,
  currentTime: Date
): VestingInfo {
  // No vesting = all tokens available immediately
  if (!vestingSchedule) {
    return {
      totalPurchased,
      tgeAmount: totalPurchased,
      vestedAmount: totalPurchased,
      lockedAmount: 0,
      claimableAmount: totalPurchased
    };
  }
  
  const { tgePercent, cliffDays, vestingDays } = vestingSchedule;
  
  const tgeAmount = Math.floor(totalPurchased * (tgePercent / 100));
  
  const daysSinceLaunchEnd = Math.floor(
    (currentTime.getTime() - launchEndsAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let vestedAmount = tgeAmount;
  
  if (daysSinceLaunchEnd >= cliffDays) {
    const vestingDaysElapsed = daysSinceLaunchEnd - cliffDays;
    const vestingAmount = totalPurchased - tgeAmount;
    
    if (vestingDaysElapsed >= vestingDays) {
      vestedAmount = totalPurchased;
    } else {
      const vestedFromSchedule = Math.floor(
        (vestingAmount * vestingDaysElapsed) / vestingDays
      );
      vestedAmount = tgeAmount + vestedFromSchedule;
    }
  }
  
  const lockedAmount = totalPurchased - vestedAmount;
  const claimableAmount = vestedAmount;
  
  return {
    totalPurchased,
    tgeAmount,
    vestedAmount,
    lockedAmount,
    claimableAmount
  };
}
