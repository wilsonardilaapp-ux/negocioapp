// src/utils/validateModuleExtra.ts

export type PlanTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export const PLAN_BASE_LIMITS: Record<PlanTier, number> = {
  FREE: 4,
  BASIC: 200,
  PRO: 1000,
  ENTERPRISE: 5000,
};

const TIER_ORDER: PlanTier[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

/**
 * Validates if the total limit (base + extra) for a module is allowed for the current plan tier.
 * Rule: Total Limit must be strictly less than the base limit of the next plan tier.
 */
export function validateModuleExtra(
  currentPlan: string | undefined,
  extra: number
): { valid: boolean; error: string; baseLimit: number; totalLimit: number } {
  // Normalize plan name to tier
  const upperPlan = (currentPlan || 'FREE').toUpperCase();
  let tier: PlanTier = 'FREE';
  
  if (upperPlan.includes('ENTERPRISE')) tier = 'ENTERPRISE';
  else if (upperPlan.includes('PRO')) tier = 'PRO';
  else if (upperPlan.includes('BASIC')) tier = 'BASIC';
  else tier = 'FREE';

  const baseLimit = PLAN_BASE_LIMITS[tier];
  const totalLimit = baseLimit + extra;

  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const nextTier = TIER_ORDER[currentTierIndex + 1];

  if (nextTier) {
    const nextTierLimit = PLAN_BASE_LIMITS[nextTier];
    if (totalLimit >= nextTierLimit) {
      return {
        valid: false,
        error: `El total (${totalLimit}) no puede igualar ni superar el límite de ${nextTier} (${nextTierLimit})`,
        baseLimit,
        totalLimit,
      };
    }
  }

  return { valid: true, error: '', baseLimit, totalLimit };
}
