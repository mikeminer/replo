import { describe, expect, it, vi } from "vitest";
import { MockSender, SmartleadSender, normalizeSmartleadEvent } from "./index.js";
describe("sender contract", () => {
  it("runs campaign lifecycle in mock", async () => { const s = new MockSender(); const c = await s.createCampaign({ name: "x" }); await s.attachMailboxes(c.externalId, ["mock-1"]); await s.upsertLeads(c.externalId, [{ email: "owned@example.com" }]); await s.setSequence(c.externalId, [{ subject: "Hi", body: "Body", delayDays: 0 }]); await s.startCampaign(c.externalId); expect((await s.listCampaigns())[0].status).toBe("ACTIVE"); });
  it("maps provider replies", () => expect(normalizeSmartleadEvent({ event_type: "EMAIL_REPLIED", id: 4, email: "a@b.com" }).eventType).toBe("reply"));
  it("uses documented create endpoint", async () => { const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ id: 42 }), { status: 200 }))); const s = new SmartleadSender("key", "https://example.test/api/v1", fetcher); await s.createCampaign({ name: "real", dailyLimit: 20 }); expect(String(fetcher.mock.calls[0][0])).toContain("/campaigns/create?api_key=key"); expect(fetcher).toHaveBeenCalledTimes(2); });
});
