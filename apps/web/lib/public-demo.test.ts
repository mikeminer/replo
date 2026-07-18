import { describe, expect, it } from "vitest";
import { isPublicCampaignDemo } from "./public-demo";

describe("isPublicCampaignDemo", () => {
  it("opens only the campaign builder on the production web host", () => {
    expect(isPublicCampaignDemo("replo.it", "/app/campaigns/new")).toBe(true);
    expect(isPublicCampaignDemo("REPLO.IT", "/app/campaigns/new")).toBe(true);
  });

  it("keeps every other host and app route private", () => {
    expect(isPublicCampaignDemo("replo.eu", "/app/campaigns/new")).toBe(false);
    expect(isPublicCampaignDemo("replo.it", "/app")).toBe(false);
    expect(isPublicCampaignDemo("preview.vercel.app", "/app/campaigns/new")).toBe(false);
    expect(isPublicCampaignDemo("replo.it", "/app/campaigns/new/results")).toBe(false);
  });
});
