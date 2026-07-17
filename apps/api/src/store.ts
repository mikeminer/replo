import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Plan } from "../../../packages/shared/src/index.js";
import type { SequenceStep } from "../../../packages/sending/src/index.js";
export type Org = { id: string; name: string; plan: Plan; monthlySendCount: number; monthlyResolveCount: number };
export type Campaign = { id: string; orgId: string; name: string; status: string; provider: string; espCampaignId?: string; espStatus?: string; sendCapDaily: number; bounceCount: number; sentCount: number; pausedReason?: string; sequence: SequenceStep[]; leads: Lead[] };
export type Lead = { id: string; firstName: string; lastName: string; companyName?: string; domain: string; email?: string; confidence?: number; verification: string; unsubscribed?: boolean };
export type Reply = { id: string; orgId: string; campaignId: string; espReplyId: string; threadId: string; subject: string; bodyText: string; fromEmail: string; fromName: string | null; sentiment: string };
export type Job = { id: string; orgId: string; type: string; status: string; result?: unknown; error?: string };
export class MemoryStore {
  organizations = new Map<string, Org>(); apiKeys = new Map<string, string>(); campaigns = new Map<string, Campaign>(); replies = new Map<string, Reply>(); jobs = new Map<string, Job>(); events = new Set<string>();
  hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
  bootstrap(name = "Replo workspace", plan: Plan = "free") { const org: Org = { id: randomUUID(), name, plan, monthlySendCount: 0, monthlyResolveCount: 0 }; const raw = `rk_test_${randomBytes(24).toString("base64url")}`; this.organizations.set(org.id, org); this.apiKeys.set(this.hash(raw), org.id); return { org, apiKey: raw }; }
  orgForKey(raw: string) { const id = this.apiKeys.get(this.hash(raw)); return id ? this.organizations.get(id) : undefined; }
  createCampaign(orgId: string, input: { name: string; sequence?: SequenceStep[] }) { const row: Campaign = { id: randomUUID(), orgId, name: input.name, status: "draft", provider: process.env.SEND_PROVIDER ?? "mock", sendCapDaily: 20, bounceCount: 0, sentCount: 0, sequence: input.sequence ?? [], leads: [] }; this.campaigns.set(row.id, row); return row; }
  createJob(orgId: string, type: string, result: unknown) { const row: Job = { id: randomUUID(), orgId, type, status: "completed", result }; this.jobs.set(row.id, row); return row; }
}
