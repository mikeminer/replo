import Stripe from "stripe";
import { isPaidBusinessPlan, type BusinessPlan, type PaidBusinessPlan } from "./plans";

let stripeClient: Stripe | undefined;
export function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  stripeClient = new Stripe(key);
  return stripeClient;
}

export function isPaidSubscriptionStatus(status: string) {
  return status === "active" || status === "trialing";
}

export function stripePriceForPlan(plan: PaidBusinessPlan) {
  const prices: Record<PaidBusinessPlan, string | undefined> = {
    startup: process.env.STRIPE_PRICE_STARTUP_MONTHLY,
    partner: process.env.STRIPE_PRICE_PARTNER_MONTHLY ?? process.env.STRIPE_PRICE_API_PRO_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };
  return prices[plan];
}

export function planForSubscription(subscription: Pick<Stripe.Subscription, "status" | "items" | "metadata">): BusinessPlan {
  if (!isPaidSubscriptionStatus(subscription.status)) return "free";
  const priceId = subscription.items.data[0]?.price.id;
  const matches: Array<[PaidBusinessPlan, string | undefined]> = [
    ["startup", process.env.STRIPE_PRICE_STARTUP_MONTHLY],
    ["partner", process.env.STRIPE_PRICE_PARTNER_MONTHLY ?? process.env.STRIPE_PRICE_API_PRO_MONTHLY],
    ["enterprise", process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY],
  ];
  const byPrice = matches.find(([, configuredPrice]) => configuredPrice && configuredPrice === priceId)?.[0];
  if (byPrice) return byPrice;
  return isPaidBusinessPlan(subscription.metadata.plan ?? "") ? subscription.metadata.plan as PaidBusinessPlan : "free";
}
