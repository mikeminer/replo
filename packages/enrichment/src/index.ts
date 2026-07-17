import { resolve4, resolveMx } from "node:dns/promises";
import { isIP } from "node:net";

export type PersonSeed = { firstName: string; lastName: string; domain: string; knownEmail?: string };
export type Candidate = { email: string; confidence: number; source: "seed" | "page" | "pattern"; verification: "valid" | "risky" | "invalid" };
export type WebsiteAnalysis = { url: string; name: string; title: string; summary: string; keywords: string[] };
export type PublicProspect = PersonSeed & { companyName: string; role?: string; email: string; confidence: number; verification: "valid" | "risky"; source: "public_page" | "owned_pattern"; sourceUrl: string; evidence: string };
const clean = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

export function generateCandidates(seed: PersonSeed): Candidate[] {
  const first = clean(seed.firstName), last = clean(seed.lastName), domain = seed.domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (seed.knownEmail) return [{ email: seed.knownEmail.toLowerCase(), confidence: 0.99, source: "seed", verification: "valid" }];
  const patterns = [`${first}.${last}`, `${first}`, `${first[0]}${last}`, `${first}${last[0]}`];
  return [...new Set(patterns)].map((local, index) => ({ email: `${local}@${domain}`, confidence: 0.9 - index * 0.04, source: "pattern", verification: "risky" }));
}

export function extractEmails(html: string, domain?: string): Candidate[] {
  const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((email) => email.toLowerCase()))]
    .filter((email) => !domain || email.endsWith(`@${domain}`))
    .map((email) => ({ email, confidence: 0.96, source: "page", verification: "valid" }));
}

export async function inspectDomain(domain: string) {
  try {
    const mx = await withTimeout(resolveMx(domain), 3_000, "DNS lookup timed out");
    return { hasMx: mx.length > 0, catchAll: "unknown" as const, mx: mx.sort((a, b) => a.priority - b.priority).map((x) => x.exchange) };
  } catch {
    try { await withTimeout(resolve4(domain), 3_000, "DNS lookup timed out"); return { hasMx: false, catchAll: "unknown" as const, mx: [] }; }
    catch { return { hasMx: false, catchAll: "unknown" as const, mx: [] }; }
  }
}

export async function resolveOwned(seed: PersonSeed): Promise<Candidate | null> {
  const domain = seed.domain.replace(/^https?:\/\//, "").split("/")[0];
  const dns = await inspectDomain(domain);
  if (!dns.hasMx && !seed.knownEmail) return null;
  return generateCandidates(seed)[0] ?? null;
}

const blockedHosts = new Set(["duckduckgo.com", "google.com", "bing.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "wikipedia.org"]);
const genericMailboxes = new Set(["admin", "billing", "careers", "contact", "hello", "info", "jobs", "legal", "marketing", "office", "press", "privacy", "sales", "support", "team"]);
const stopWords = new Set("about after also and are been being business can company could from have into more most not our product services software solution that the their them they this through use using was were what when where which will with your you per una che con del della delle dei gli nel nella non più sua suo".split(" "));

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

function textFromHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|#39);/g, " ").replace(/\s+/g, " ").trim();
}
function decodeHtml(value: string) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'"); }
function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"))?.[1] ?? "");
}
function titleCase(value: string) { return value.split(/[._\-\s]+/).filter(Boolean).map((x) => x[0]?.toUpperCase() + x.slice(1).toLowerCase()).join(" "); }
function hostOf(value: string) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }
function registrableHost(host: string) { const parts = host.split("."); return parts.slice(-2).join("."); }
async function fetchHtml(url: string, fetcher: typeof fetch) {
  const target = new URL(url), host = target.hostname.toLowerCase();
  const privateIpv4 = /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
  const privateIpv6 = host === "::1" || /^(?:fc|fd|fe80)/i.test(host);
  if (!/^https?:$/.test(target.protocol) || host === "localhost" || host.endsWith(".localhost") || (isIP(host) === 4 && privateIpv4) || (isIP(host) === 6 && privateIpv6)) throw new Error("Only public HTTP(S) pages can be researched");
  const response = await fetcher(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; ReploResearch/1.0; +https://replo.it)" }, signal: AbortSignal.timeout(5_000), redirect: "follow" });
  if (!response.ok) throw new Error(`Public page returned ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0); if (length > 2_000_000) throw new Error("Public page is too large to research");
  return { html: (await response.text()).slice(0, 2_000_000), url: response.url || url };
}
function keywords(text: string) {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-zà-ÿ][a-zà-ÿ0-9-]{3,}/g) ?? []) if (!stopWords.has(raw)) counts.set(raw, (counts.get(raw) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

export async function analyzeWebsite(url: string, fetcher: typeof fetch = fetch): Promise<WebsiteAnalysis> {
  const page = await fetchHtml(url, fetcher), host = hostOf(page.url);
  const title = decodeHtml(page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "");
  const summary = meta(page.html, "description") || meta(page.html, "og:description") || textFromHtml(page.html).slice(0, 320);
  const name = meta(page.html, "og:site_name") || title.split(/[|–—-]/)[0]?.trim() || host.split(".")[0];
  return { url: page.url, name, title, summary, keywords: keywords(`${title} ${summary} ${textFromHtml(page.html).slice(0, 8_000)}`) };
}

function searchUrls(html: string) {
  const urls: string[] = [];
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let href = decodeHtml(match[1]);
    try {
      const parsed = new URL(href, "https://html.duckduckgo.com");
      href = parsed.searchParams.get("uddg") ?? href;
      const bingTarget = parsed.searchParams.get("u");
      if (bingTarget?.startsWith("a1")) try { href = Buffer.from(bingTarget.slice(2), "base64").toString("utf8"); } catch { /* Ignore malformed redirect targets. */ }
      const target = new URL(href);
      const host = hostOf(target.href);
      if (target.protocol.startsWith("http") && host && ![...blockedHosts].some((x) => host === x || host.endsWith(`.${x}`))) urls.push(target.origin + target.pathname);
    } catch { /* Ignore relative/search links. */ }
  }
  return [...new Set(urls)];
}
function plausibleCompanyPage(value: string) {
  try {
    const path = new URL(value).pathname.toLowerCase(), segments = path.split("/").filter(Boolean);
    return segments.length <= 2 && !/(?:^|\/)(blog|news|article|resources|directory|list|lists|companies|dataset|database|product)(?:\/|$)/.test(path);
  } catch { return false; }
}
function publicPageLinks(html: string, base: string) {
  const links: string[] = [];
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) try {
    const url = new URL(decodeHtml(match[1]), base);
    if (hostOf(url.href) === hostOf(base) && /\b(about|team|people|leadership|contact|chi-siamo|azienda|contatti)\b/i.test(url.pathname)) links.push(url.href);
  } catch { /* Ignore malformed links. */ }
  return [...new Set(links)].slice(0, 3);
}
function peopleFromJsonLd(html: string) {
  const people: Array<{ firstName: string; lastName: string; role?: string }> = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    const node = value as Record<string, unknown>, type = String(node["@type"] ?? "").toLowerCase();
    if (type === "person" && typeof node.name === "string") {
      const bits = node.name.trim().split(/\s+/); if (bits.length > 1) people.push({ firstName: bits[0], lastName: bits.slice(1).join(" "), role: typeof node.jobTitle === "string" ? node.jobTitle : undefined });
    }
    Object.values(node).forEach(visit);
  };
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) try { visit(JSON.parse(match[1])); } catch { /* Invalid publisher JSON-LD. */ }
  return people;
}
function personFromEmail(email: string) {
  const local = email.split("@")[0], bits = local.split(/[._-]+/).filter(Boolean);
  if (bits.length > 1 && bits.every((x) => /^[a-z]{2,}$/i.test(x))) return { firstName: titleCase(bits[0]), lastName: titleCase(bits.slice(1).join(" ")) };
  return { firstName: "Team", lastName: titleCase(local) || "Contact" };
}

async function prospectsFromCompany(companyUrl: string, fetcher: typeof fetch): Promise<PublicProspect[]> {
  const target = new URL(companyUrl), home = await fetchHtml(target.origin, fetcher), domain = hostOf(home.url), homeAnalysis = await analyzeWebsite(home.url, async () => new Response(home.html, { status: 200 }));
  const pageUrls = [...new Set([...(target.pathname !== "/" ? [companyUrl] : []), ...publicPageLinks(home.html, home.url)])];
  const fetched = await Promise.allSettled(pageUrls.map((url) => fetchHtml(url, fetcher)));
  const pages = [{ url: home.url, html: home.html }, ...fetched.filter((row): row is PromiseFulfilledResult<{ url: string; html: string }> => row.status === "fulfilled").map((row) => row.value)];
  const found: PublicProspect[] = [], seen = new Set<string>();
  for (const page of pages) {
    const publishedEmails = extractEmails(page.html, domain);
    const publishedAddresses = new Set(publishedEmails.map((candidate) => candidate.email));
    for (const person of peopleFromJsonLd(page.html).slice(0, 3)) {
      const candidate = generateCandidates({ ...person, domain })[0]; if (!candidate || seen.has(candidate.email) || publishedAddresses.has(candidate.email)) continue;
      seen.add(candidate.email);
      found.push({ ...person, domain, email: candidate.email, companyName: homeAnalysis.name, confidence: candidate.confidence, verification: "risky", source: "owned_pattern", sourceUrl: page.url, evidence: "Person published in company structured data; address resolved by Replo" });
    }
    for (const candidate of publishedEmails) {
      if (seen.has(candidate.email)) continue;
      const local = candidate.email.split("@")[0].toLowerCase(); if (genericMailboxes.has(local) || !/[._-]/.test(local)) continue;
      const person = personFromEmail(candidate.email); seen.add(candidate.email);
      found.push({ ...person, domain, knownEmail: candidate.email, email: candidate.email, companyName: homeAnalysis.name, confidence: candidate.confidence, verification: "valid", source: "public_page", sourceUrl: page.url, evidence: "Email published on the company website" });
    }
  }
  return found;
}

export async function discoverPublicProspects(input: { url: string; audience?: string; territory?: string; limit?: number }, fetcher: typeof fetch = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Discovery time budget reached")), 18_000);
  const boundedFetcher = ((resource: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => fetcher(resource, { ...init, signal: init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal })) as typeof fetch;
  try {
  const analysis = await analyzeWebsite(input.url, boundedFetcher), sourceHost = hostOf(analysis.url), limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const intent = input.audience?.trim() || analysis.keywords.slice(0, 3).join(" ") || analysis.summary.slice(0, 80);
  const territory = input.territory?.trim() || "Europe";
  const query = `${intent} ${territory} official company website`;
  const queries = [query, `${intent} ${territory} inurl:about founder leadership`];
  const foundUrls: string[] = [];
  const searchRows = await Promise.allSettled(queries.map((value) => fetchHtml(`https://www.bing.com/search?q=${encodeURIComponent(value)}`, boundedFetcher)));
  for (const row of searchRows) if (row.status === "fulfilled") foundUrls.push(...searchUrls(row.value.html));
  const companyUrls = [...new Set(foundUrls)].filter((url) => registrableHost(hostOf(url)) !== registrableHost(sourceHost) && plausibleCompanyPage(url)).slice(0, 8);
  const prospects: PublicProspect[] = [];
  const rows = await Promise.allSettled(companyUrls.map((url) => prospectsFromCompany(url, boundedFetcher)));
  for (const row of rows) if (row.status === "fulfilled") for (const prospect of row.value) if (!prospects.some((x) => x.email === prospect.email)) prospects.push(prospect);
  return { analysis, query, prospects: prospects.slice(0, limit), sourcesScanned: companyUrls.length };
  } finally { clearTimeout(timer); }
}
