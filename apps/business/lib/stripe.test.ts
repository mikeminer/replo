import { describe, expect, it } from "vitest";
import { isPaidSubscriptionStatus, planForSubscription } from "./stripe";

describe("Stripe plan mapping", () => {
  it("unlocks only active or trialing subscriptions", () => {
    expect(isPaidSubscriptionStatus("active")).toBe(true);
    expect(isPaidSubscriptionStatus("trialing")).toBe(true);
    expect(isPaidSubscriptionStatus("past_due")).toBe(false);
    expect(isPaidSubscriptionStatus("canceled")).toBe(false);
  });

  it("maps paid Stripe prices to the correct Replo plan", () => {
    process.env.STRIPE_PRICE_STARTUP_MONTHLY = "price_startup";
    process.env.STRIPE_PRICE_PARTNER_MONTHLY = "price_partner";
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = "price_enterprise";
    const subscription = (price: string, status = "active", metadata: Record<string, string> = {}) => ({
      status,
      metadata,
      items: { data: [{ price: { id: price } }] },
    }) as never;
    expect(planForSubscription(subscription("price_startup"))).toBe("startup");
    expect(planForSubscription(subscription("price_partner"))).toBe("partner");
    expect(planForSubscription(subscription("price_enterprise"))).toBe("enterprise");
    expect(planForSubscription(subscription("price_startup", "canceled"))).toBe("free");
    expect(planForSubscription(subscription("price_unknown", "active", { plan: "enterprise" }))).toBe("enterprise");
  });
});
