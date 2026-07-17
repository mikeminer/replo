export class ReploClient {
  constructor(readonly options: { baseUrl: string; apiKey: string; fetch?: typeof fetch }) {}
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> { const response = await (this.options.fetch ?? fetch)(`${this.options.baseUrl}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${this.options.apiKey}`, ...init.headers } }); const body = await response.json() as T; if (!response.ok) throw new Error((body as { error?: { message?: string } }).error?.message ?? `Replo API ${response.status}`); return body; }
  me = () => this.request<{ organization: { id: string; name: string; plan: "free" | "pro" } }>("/v1/me");
  research = (url: string) => this.request<{ jobId: string }>("/v1/research/from-url", { method: "POST", body: JSON.stringify({ url }) });
  job = (id: string) => this.request<{ id: string; status: string; result?: unknown }>(`/v1/jobs/${id}`);
  findEmail = (input: object) => this.request("/v1/emails/find", { method: "POST", body: JSON.stringify(input) });
  createCampaign = (input: object) => this.request<{ id: string }>("/v1/campaigns", { method: "POST", body: JSON.stringify(input) });
  addLeads = (id: string, leads: object[]) => this.request(`/v1/campaigns/${id}/leads`, { method: "POST", body: JSON.stringify({ leads }) });
  resolveCampaign = (id: string) => this.request(`/v1/campaigns/${id}/resolve`, { method: "POST" });
  launchCampaign = (id: string, acceptedReplyLock = false) => this.request(`/v1/campaigns/${id}/launch`, { method: "POST", body: JSON.stringify({ acceptedReplyLock }) });
  pauseCampaign = (id: string) => this.request(`/v1/campaigns/${id}/pause`, { method: "POST" });
  replies = (id: string) => this.request<{ replies: unknown[] }>(`/v1/campaigns/${id}/replies`);
  reply = (id: string) => this.request(`/v1/replies/${id}`);
  draftReply = (id: string) => this.request(`/v1/replies/${id}/draft`, { method: "POST" });
  respond = (id: string, body: string) => this.request(`/v1/replies/${id}/respond`, { method: "POST", body: JSON.stringify({ body }) });
  deliverability = () => this.request("/v1/deliverability/status");
}
