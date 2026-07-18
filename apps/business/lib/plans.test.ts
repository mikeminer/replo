import { describe, expect, it } from "vitest";
import { PLAN_DETAILS, isPaidBusinessPlan } from "./plans";

describe("business plan entitlements", () => {
  it("enforces the Startup and Partner one-key boundary", () => {
    expect(PLAN_DETAILS.startup).toMatchObject({ monthlyApiCalls: 300, maxActiveKeys: 1 });
    expect(PLAN_DETAILS.partner).toMatchObject({ monthlyApiCalls: null, maxActiveKeys: 1 });
  });

  it("gives Enterprise unlimited labeled keys", () => {
    expect(PLAN_DETAILS.enterprise).toMatchObject({ monthlyApiCalls: null, maxActiveKeys: null, customKeyLabels: true });
    expect(isPaidBusinessPlan("enterprise")).toBe(true);
    expect(isPaidBusinessPlan("free")).toBe(false);
  });
});
