export type Mailbox = { id: string; email: string; fromName?: string; warmupEnabled: boolean; dailyLimit: number; status: string };
export type EspLead = { email: string; firstName?: string; lastName?: string; companyName?: string; customFields?: Record<string, string> };
export type SequenceStep = { subject: string; body: string; delayDays: number };
export type CreateCampaignInput = { name: string; dailyLimit?: number; stopOnReply?: boolean };
export type ReplyInput = { campaignId: string; threadId: string; emailStatsId?: string; body: string; replyAll?: boolean };
export interface SenderPort {
  health(): Promise<{ ok: boolean; details: unknown }>;
  listCampaigns(): Promise<Array<{ id: string; name: string; status: string }>>;
  listMailboxes(): Promise<Mailbox[]>;
  createCampaign(input: CreateCampaignInput): Promise<{ externalId: string }>;
  attachMailboxes(externalCampaignId: string, mailboxIds: string[]): Promise<void>;
  upsertLeads(externalCampaignId: string, leads: EspLead[]): Promise<void>;
  setSequence(externalCampaignId: string, steps: SequenceStep[]): Promise<void>;
  configureCampaign(externalCampaignId: string, dailyLimit: number): Promise<void>;
  startCampaign(externalCampaignId: string): Promise<void>;
  pauseCampaign(externalCampaignId: string): Promise<void>;
  registerWebhook(input: { name: string; url: string; campaignId?: string }): Promise<{ externalId: string }>;
  sendReply(input: ReplyInput): Promise<{ externalId: string }>;
}

export class SmartleadError extends Error {
  constructor(public status: number, public payload: unknown, message = `Smartlead API returned ${status}`) { super(message); }
}

export class SmartleadSender implements SenderPort {
  constructor(private apiKey: string, private baseUrl = "https://server.smartlead.ai/api/v1", private fetcher: typeof fetch = fetch) {
    if (!apiKey) throw new Error("SMARTLEAD_API_KEY is required for smartlead mode");
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`); url.searchParams.set("api_key", this.apiKey);
    const response = await this.fetcher(url, { ...init, headers: { "content-type": "application/json", accept: "application/json", ...init.headers } });
    const text = await response.text(); let payload: unknown = text;
    try { payload = text ? JSON.parse(text) : {}; } catch { /* preserve provider text */ }
    if (!response.ok) throw new SmartleadError(response.status, payload);
    return payload as T;
  }
  async health() { try { const accounts = await this.listMailboxes(); return { ok: true, details: { provider: "smartlead", mailboxes: accounts.length } }; } catch (error) { return { ok: false, details: error instanceof Error ? error.message : error }; } }
  async listCampaigns() {
    const rows = await this.request<Array<{ id: number; name: string; status: string }>>("/campaigns");
    return rows.map((x) => ({ id: String(x.id), name: x.name, status: x.status }));
  }
  async listMailboxes() {
    const raw = await this.request<Array<Record<string, unknown>> | { data: Array<Record<string, unknown>> }>("/email-accounts/?offset=0&limit=100");
    const rows = Array.isArray(raw) ? raw : raw.data;
    return rows.map((x) => ({ id: String(x.id), email: String(x.from_email ?? x.email ?? ""), fromName: String(x.from_name ?? ""), warmupEnabled: Boolean(x.warmup_enabled), dailyLimit: Number(x.max_email_per_day ?? x.daily_limit ?? 0), status: String(x.is_smtp_success ? "connected" : x.status ?? "unknown") }));
  }
  async createCampaign(input: CreateCampaignInput) {
    const row = await this.request<{ id: number }>("/campaigns/create", { method: "POST", body: JSON.stringify({ name: input.name }) });
    const id = String(row.id); await this.configureCampaign(id, input.dailyLimit ?? 20); return { externalId: id };
  }
  async configureCampaign(id: string, dailyLimit: number) {
    await this.request(`/campaigns/${id}/settings`, { method: "PATCH", body: JSON.stringify({ max_leads_per_day: dailyLimit, stop_lead_settings: "REPLY_TO_AN_EMAIL", send_as_plain_text: true, track_settings: ["DONT_LINK_CLICK"], unsubscribe_text: "Not relevant? Reply unsubscribe and I won't contact you again." }) });
  }
  async attachMailboxes(id: string, mailboxIds: string[]) {
    await this.request(`/campaigns/${id}/email-accounts`, { method: "POST", body: JSON.stringify({ email_account_ids: mailboxIds.map(Number) }) });
  }
  async upsertLeads(id: string, leads: EspLead[]) {
    for (let i = 0; i < leads.length; i += 400) await this.request(`/campaigns/${id}/leads`, { method: "POST", body: JSON.stringify({ lead_list: leads.slice(i, i + 400).map((x) => ({ email: x.email, first_name: x.firstName, last_name: x.lastName, company_name: x.companyName, custom_fields: x.customFields })) }) });
  }
  async setSequence(id: string, steps: SequenceStep[]) {
    await this.request(`/campaigns/${id}/sequences`, { method: "POST", body: JSON.stringify({ sequences: steps.map((x, i) => ({ seq_number: i + 1, subject: x.subject, email_body: x.body, seq_delay_details: { delay_in_days: x.delayDays } })) }) });
  }
  async startCampaign(id: string) { await this.request(`/campaigns/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }); }
  async pauseCampaign(id: string) { await this.request(`/campaigns/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "PAUSED" }) }); }
  async registerWebhook(input: { name: string; url: string; campaignId?: string }) {
    const row = await this.request<{ id: number }>("/webhook/create", { method: "POST", body: JSON.stringify({ name: input.name, webhook_url: input.url, email_campaign_id: input.campaignId ? Number(input.campaignId) : undefined, association_type: input.campaignId ? 3 : 1, event_type_map: { EMAIL_SENT: true, EMAIL_REPLIED: true, EMAIL_BOUNCED: true, LEAD_UNSUBSCRIBED: true, CAMPAIGN_STATUS_CHANGED: true } }) });
    return { externalId: String(row.id) };
  }
  async sendReply(input: ReplyInput) {
    const row = await this.request<Record<string, unknown>>(`/campaigns/${input.campaignId}/reply-email-thread`, { method: "POST", body: JSON.stringify({ email_stats_id: input.emailStatsId ? Number(input.emailStatsId) : undefined, thread_id: input.threadId, email_body: input.body, reply_all: input.replyAll ?? false }) });
    return { externalId: String(row.message_id ?? row.id ?? input.threadId) };
  }
}

export class MockSender implements SenderPort {
  campaigns = new Map<string, { name: string; status: string; leads: EspLead[]; steps: SequenceStep[]; mailboxes: string[] }>();
  async health() { return { ok: true, details: { provider: "mock" } }; }
  async listCampaigns() { return [...this.campaigns].map(([id, x]) => ({ id, name: x.name, status: x.status })); }
  async listMailboxes() { return [{ id: "mock-1", email: "managed@send.replo.eu", warmupEnabled: true, dailyLimit: 20, status: "connected" }]; }
  async createCampaign(input: CreateCampaignInput) { const id = crypto.randomUUID(); this.campaigns.set(id, { name: input.name, status: "DRAFTED", leads: [], steps: [], mailboxes: [] }); return { externalId: id }; }
  private get(id: string) { const row = this.campaigns.get(id); if (!row) throw new Error("Campaign not found"); return row; }
  async attachMailboxes(id: string, mailboxIds: string[]) { this.get(id).mailboxes = mailboxIds; }
  async upsertLeads(id: string, leads: EspLead[]) { this.get(id).leads.push(...leads); }
  async setSequence(id: string, steps: SequenceStep[]) { this.get(id).steps = steps; }
  async configureCampaign() {}
  async startCampaign(id: string) { this.get(id).status = "ACTIVE"; }
  async pauseCampaign(id: string) { this.get(id).status = "PAUSED"; }
  async registerWebhook() { return { externalId: crypto.randomUUID() }; }
  async sendReply() { return { externalId: crypto.randomUUID() }; }
}

export const createSender = (env: NodeJS.ProcessEnv = process.env): SenderPort => env.SEND_PROVIDER === "smartlead" ? new SmartleadSender(env.SMARTLEAD_API_KEY ?? "") : new MockSender();

export type SmartleadEvent = { eventType: "sent" | "reply" | "bounce" | "unsubscribe" | "unknown"; eventId: string; campaignId?: string; leadEmail?: string; messageId?: string; threadId?: string; subject?: string; bodyText?: string; fromEmail?: string; fromName?: string; bounceType?: string; occurredAt: string; raw: unknown };
export function normalizeSmartleadEvent(payload: Record<string, unknown>): SmartleadEvent {
  const rawType = String(payload.event_type ?? payload.event ?? "").toUpperCase();
  const eventType = rawType.includes("REPL") ? "reply" : rawType.includes("BOUNC") ? "bounce" : rawType.includes("UNSUB") ? "unsubscribe" : rawType.includes("SENT") ? "sent" : "unknown";
  const occurredAt = String(payload.timestamp ?? payload.event_timestamp ?? new Date().toISOString());
  const leadEmail = String(payload.lead_email ?? payload.email ?? payload.to_email ?? "") || undefined;
  const eventId = String(payload.id ?? payload.webhook_id ?? `${rawType}:${payload.campaign_id ?? ""}:${leadEmail ?? ""}:${occurredAt}`);
  return { eventType, eventId, campaignId: payload.campaign_id ? String(payload.campaign_id) : undefined, leadEmail, messageId: payload.message_id ? String(payload.message_id) : undefined, threadId: payload.thread_id ? String(payload.thread_id) : undefined, subject: String(payload.subject ?? "") || undefined, bodyText: String(payload.email_body ?? payload.reply_body ?? payload.body ?? "") || undefined, fromEmail: String(payload.from_email ?? leadEmail ?? "") || undefined, fromName: String(payload.from_name ?? "") || undefined, bounceType: String(payload.bounce_type ?? payload.bounce_reason ?? "") || undefined, occurredAt, raw: payload };
}
