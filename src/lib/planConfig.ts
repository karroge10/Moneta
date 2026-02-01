/**
 * Plan settings – single source of truth for limits and feature flags per plan.
 * Use this for enforcement (goals, categories, investments, round-up assets) and for UI.
 *
 * Plan is stored in the database (User.plan). Clerk does not hold plan by default;
 * to mirror plan in Clerk (e.g. publicMetadata.plan), sync it when plan changes
 * (e.g. in PATCH /api/user/settings) via clerkClient().users.updateUserMetadata().
 */

export const PLAN_IDS = ['basic', 'premium', 'ultimate'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function isPlanId(s: string | null | undefined): s is PlanId {
  return s != null && PLAN_IDS.includes(s as PlanId);
}

/** Numeric limit; null means unlimited */
export interface PlanLimits {
  maxGoals: number | null;
  maxCategories: number | null;
  maxInvestments: number | null;
  maxRoundUpAssets: number | null;
}

export interface PlanFeatures {
  advancedStatistics: boolean;
  investmentsNotifications: boolean;
  customCategoryIcons: boolean;
  weeklyMonthlyReports: boolean;
  dataImportExport: boolean;
  earlyAccess: boolean;
  prioritySupport: boolean;
  discordRole: boolean;
}

export interface PlanConfig {
  id: PlanId;
  limits: PlanLimits;
  features: PlanFeatures;
}

const planConfigs: Record<PlanId, PlanConfig> = {
  basic: {
    id: 'basic',
    limits: {
      maxGoals: 3,
      maxCategories: 20,
      maxInvestments: 10,
      maxRoundUpAssets: 5,
    },
    features: {
      advancedStatistics: false,
      investmentsNotifications: false,
      customCategoryIcons: false,
      weeklyMonthlyReports: false,
      dataImportExport: false,
      earlyAccess: false,
      prioritySupport: false,
      discordRole: false,
    },
  },
  premium: {
    id: 'premium',
    limits: {
      maxGoals: 10,
      maxCategories: 50,
      maxInvestments: 25,
      maxRoundUpAssets: 10,
    },
    features: {
      advancedStatistics: true,
      investmentsNotifications: true,
      customCategoryIcons: true,
      weeklyMonthlyReports: false,
      dataImportExport: false,
      earlyAccess: false,
      prioritySupport: true,
      discordRole: false,
    },
  },
  ultimate: {
    id: 'ultimate',
    limits: {
      maxGoals: null,
      maxCategories: null,
      maxInvestments: null,
      maxRoundUpAssets: null,
    },
    features: {
      advancedStatistics: true,
      investmentsNotifications: true,
      customCategoryIcons: true,
      weeklyMonthlyReports: true,
      dataImportExport: true,
      earlyAccess: true,
      prioritySupport: true,
      discordRole: true,
    },
  },
};

export function getPlanConfig(planId: string | null | undefined): PlanConfig {
  const id = isPlanId(planId) ? planId : 'basic';
  return planConfigs[id];
}

export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  return getPlanConfig(planId).limits;
}

export function getPlanFeatures(planId: string | null | undefined): PlanFeatures {
  return getPlanConfig(planId).features;
}

/** Check if the user's plan allows at least this many of a resource (e.g. goals). */
export function isWithinLimit(
  planId: string | null | undefined,
  limitKey: keyof PlanLimits,
  currentCount: number
): boolean {
  const limits = getPlanLimits(planId);
  const max = limits[limitKey];
  if (max === null) return true;
  return currentCount < max;
}

/** Get the max allowed for a limit; null means unlimited. */
export function getMaxAllowed(
  planId: string | null | undefined,
  limitKey: keyof PlanLimits
): number | null {
  return getPlanLimits(planId)[limitKey];
}
