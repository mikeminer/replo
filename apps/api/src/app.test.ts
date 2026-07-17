import { beforeEach, describe, expect, it } from "vitest";
import { MockSender } from "@replo/sending";
import { createApp } from "./app.js";
describe("Replo API", () => {
  beforeEach(() => { process.env.INTERNAL_SECRET = "test"; process.env.SEND_PROVIDER = "mock"; process.env.ALLOW_DEV_ROUTES = "true"; process.env.BILLING_MOCK = "true"; });
  it("redacts free replies and unlocks Pro", async () => {
    const { app } = createApp({ sender: new MockSender() });
    const bootResponse = await app.request("/v1/internal/bootstrap", { method: "POST", headers: { "x-internal-secret": "test", "content-type": "application/json" }, body: "{}" });
    const boot = await bootResponse.json() as any;
    const h = { authorization: `Bearer ${boot.apiKey}`, "content-type": "application/json" };
    const campaignResponse = await app.request("/v1/campaigns", { method: "POST", headers: h, body: JSON.stringify({ name: "Test", sequence: [{ subject: "Hi", body: "Hello", delayDays: 0 }] }) });
    const campaign = await campaignResponse.json() as any;
    await app.request(`/v1/campaigns/${campaign.id}/leads`, { method: "POST", headers: h, body: JSON.stringify({ leads: [{ firstName: "Safe", lastName: "Owner", domain: "example.com", knownEmail: "owned@example.com" }] }) });
    const launch = await app.request(`/v1/campaigns/${campaign.id}/launch`, { method: "POST", headers: h, body: JSON.stringify({ acceptedReplyLock: true }) }); expect(launch.status).toBe(200);
    await app.request("/v1/dev/simulate-reply", { method: "POST", headers: h, body: JSON.stringify({ campaignId: campaign.id, fromEmail: "owned@example.com", bodyText: "Yes" }) });
    const locked = await (await app.request(`/v1/campaigns/${campaign.id}/replies`, { headers: h })).json() as any; expect(locked.replies[0]).toMatchObject({ locked: true, bodyText: "", fromEmail: "" });
    await app.request("/v1/dev/upgrade", { method: "POST", headers: h }); const unlocked = await (await app.request(`/v1/campaigns/${campaign.id}/replies`, { headers: h })).json() as any; expect(unlocked.replies[0]).toMatchObject({ locked: false, bodyText: "Yes", fromEmail: "owned@example.com" });
  });
  it("pauses above bounce threshold", async () => { const sender = new MockSender(), { app, store } = createApp({ sender }); const boot = store.bootstrap(); const c = store.createCampaign(boot.org.id, { name: "bounce", sequence: [{ subject: "x", body: "x", delayDays: 0 }] }); const ext = await sender.createCampaign({ name: "x" }); c.espCampaignId = ext.externalId; c.sentCount = 10; const response = await app.request("/v1/webhooks/esp/smartlead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_type: "EMAIL_BOUNCED", id: "b1", campaign_id: ext.externalId, email: "bad@example.com" }) }); expect(response.status).toBe(200); expect(c.status).toBe("paused"); });
});
