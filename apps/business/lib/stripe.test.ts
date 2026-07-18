import { describe, expect, it } from "vitest";
import { isPaidSubscriptionStatus } from "./stripe";

describe("Stripe plan mapping", () => {
  it("unlocks only active or trialing subscriptions", () => {
    expect(isPaidSubscriptionStatus("active")).toBe(true);
    expect(isPaidSubscriptionStatus("trialing")).toBe(true);
    expect(isPaidSubscriptionStatus("past_due")).toBe(false);
    expect(isPaidSubscriptionStatus("canceled")).toBe(false);
  });
});
