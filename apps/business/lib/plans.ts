export const BUSINESS_PLANS = ["free", "startup", "partner", "enterprise"] as const;
export const PAID_BUSINESS_PLANS = ["startup", "partner", "enterprise"] as const;

export type BusinessPlan = (typeof BUSINESS_PLANS)[number];
export type PaidBusinessPlan = (typeof PAID_BUSINESS_PLANS)[number];

export const PLAN_DETAILS: Record<BusinessPlan, {
  label: string;
  monthlyApiCalls: number | null;
  maxActiveKeys: number | null;
  customKeyLabels: boolean;
}> = {
  free: { label: "Testing", monthlyApiCalls: 0, maxActiveKeys: 0, customKeyLabels: false },
  startup: { label: "Startup", monthlyApiCalls: 300, maxActiveKeys: 1, customKeyLabels: false },
  partner: { label: "Partner", monthlyApiCalls: null, maxActiveKeys: 1, customKeyLabels: false },
  enterprise: { label: "Enterprise", monthlyApiCalls: null, maxActiveKeys: null, customKeyLabels: true },
};

export function isBusinessPlan(value: string): value is BusinessPlan {
  return BUSINESS_PLANS.includes(value as BusinessPlan);
}

export function isPaidBusinessPlan(value: string): value is PaidBusinessPlan {
  return PAID_BUSINESS_PLANS.includes(value as PaidBusinessPlan);
}
