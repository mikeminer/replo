export class ReploClient {
  constructor(readonly options: { baseUrl: string; apiKey?: string; fetch?: typeof fetch }) {}
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> { const headers = new Headers(init.headers); if (!headers.has("content-type")) headers.set("content-type", "application/json"); if (this.options.apiKey) headers.set("authorization", `Bearer ${this.options.apiKey}`); const response = await (this.options.fetch ?? fetch)(`${this.options.baseUrl}${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(25_000), headers }); const body = await response.json() as T; if (!response.ok) throw new Error((body as { error?: { message?: string } }).error?.message ?? `Replo API ${response.status}`); return body; }
  me = () => this.request<{ organization: { id: string; name: string; plan: "free" | "pro" } }>("/v1/me");
  research = (url: string) => this.request<{ jobId: string }>("/v1/research/from-url", { method: "POST", body: JSON.stringify({ url }) });
  discoverProspects = (input: { url: string; audience?: string; territory?: string; limit?: number }) => { const query = new URLSearchParams(Object.entries(input).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => [key, String(value)])); return this.request<DiscoveryResult>(`/v1/prospects/discover?${query}`); };
  job = (id: string) => this.request<{ id: string; status: string; result?: unknown }>(`/v1/jobs/${id}`);
  findEmail = (input: object) => this.request("/v1/emails/find", { method: "POST", body: JSON.stringify(input) });
  createCampaign = (input: object) => this.request<{ id: string }>("/v1/campaigns", { method: "POST", body: JSON.stringify(input) });
  launchFromProspects = (input: object) => this.request<{ id: string; status: string; provider: string }>("/v1/campaigns/launch-from-prospects", { method: "POST", body: JSON.stringify(input) });
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

export type DiscoveryProspect = { firstName: string; lastName: string; domain: string; knownEmail?: string; email: string; companyName: string; role?: string; confidence: number; verification: "valid" | "risky"; source: "public_page" | "owned_pattern"; sourceUrl: string; evidence: string };
export type DiscoveryResult = { analysis: { url: string; name: string; title: string; summary: string; keywords: string[] }; query: string; prospects: DiscoveryProspect[]; sourcesScanned: number; partial?: boolean };
