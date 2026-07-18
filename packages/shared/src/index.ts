import { z } from "zod";

export const PLANS = ["free", "startup", "partner", "enterprise"] as const;
export type Plan = (typeof PLANS)[number];
export const isPaidPlan = (plan: Plan) => plan !== "free";
export const SEND_PROVIDERS = ["mock", "smartlead", "instantly"] as const;
export type SendProvider = (typeof SEND_PROVIDERS)[number];
export const LIMITS = {
  maxBounceRate: Number(process.env.MAX_BOUNCE_RATE ?? 0.03),
  freeDaily: Number(process.env.FREE_MAX_SENDS_PER_DAY ?? 20),
  freeMonthly: Number(process.env.FREE_MAX_SENDS_PER_MONTH ?? 40),
  proDaily: Number(process.env.PRO_DEFAULT_SENDS_PER_DAY ?? 50),
  minConfidence: Number(process.env.MIN_EMAIL_CONFIDENCE ?? 0.78),
} as const;
export const emailSchema = z.string().email();
export type ApiError = { error: { code: string; message: string } };
export function redactReply<T extends { bodyText: string; fromEmail: string; fromName?: string | null }>(reply: T, plan: Plan) {
  return isPaidPlan(plan) ? { ...reply, locked: false } : { ...reply, bodyText: "", fromEmail: "", fromName: null, locked: true };
}
