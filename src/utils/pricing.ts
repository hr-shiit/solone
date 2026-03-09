export interface TierConfig {
  minAmount: number;
  maxAmount: number;
  pricePerToken: number;
}

export function calculateTieredCost(
  amount: number,
  tiers: TierConfig[],
  basePricePerToken: number
): number {
  if (tiers.length === 0) {
    return amount * basePricePerToken;
  }
  
  const sortedTiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  
  let remainingAmount = amount;
  let totalCost = 0;
  
  for (const tier of sortedTiers) {
    if (remainingAmount <= 0) break;
    
    const tierCapacity = tier.maxAmount - tier.minAmount;
    const amountInTier = Math.min(remainingAmount, tierCapacity);
    
    totalCost += amountInTier * tier.pricePerToken;
    remainingAmount -= amountInTier;
  }
  
  // Overflow uses base price
  if (remainingAmount > 0) {
    totalCost += remainingAmount * basePricePerToken;
  }
  
  return totalCost;
}
