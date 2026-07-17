import { resolve4, resolveMx } from "node:dns/promises";
import { isIP } from "node:net";

export type PersonSeed = { firstName: string; lastName: string; domain: string; knownEmail?: string };
export type Candidate = { email: string; confidence: number; source: "seed" | "page" | "pattern"; verification: "valid" | "risky" | "invalid" };
export type WebsiteAnalysis = { url: string; name: string; title: string; summary: string; keywords: string[] };
export type PublicProspect = PersonSeed & { companyName: string; role?: string; email: string; confidence: number; verification: "valid" | "risky"; source: "public_page" | "owned_pattern"; sourceUrl: string; evidence: string };
export type DiscoveryChannelCategory = "marketplace" | "ecosystem" | "network" | "community" | "institutional";
export type DiscoveryChannelSummary = { id: string; label: string; category: DiscoveryChannelCategory; purpose: "company_discovery" | "company_signal" | "territory_validation"; resultsFound: boolean };
export type DiscoveryContextSource = { id: string; label: string; purpose: "market_context" | "community_mapping" };
type DiscoveryChannelDefinition = Omit<DiscoveryChannelSummary, "resultsFound"> & { hosts: string[]; priority: number; query: (intent: string, territory: string) => string };
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

const blockedHosts = new Set(["duckduckgo.com", "google.com", "bing.com", "yahoo.com", "yimg.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "wikipedia.org", "indeed.com", "glassdoor.com", "crunchbase.com", "g2.com", "trustpilot.com", "yelp.com", "reddit.com", "topconsumerreviews.com"]);
const genericMailboxes = new Set(["admin", "billing", "careers", "contact", "hello", "info", "jobs", "legal", "marketing", "office", "press", "privacy", "sales", "support", "team"]);
const genericMailboxTokens = new Set(["account", "accounts", "anonymous", "anonimo", "care", "complaint", "complaints", "consumer", "consumerrelations", "customer", "customers", "customerservice", "editorial", "enquiry", "enquiries", "help", "imprese", "inquiry", "media", "redazione", "relations", "service", "services", "webmaster"]);
const nonPersonTokens = new Set("about advantage agency ai animalia artificial azienda brands business certificazioni chief commission company contact contacts corsi course data designer dettagli director ecommerce experience featured group gruppo innovation intelligence investor longevity management manager managing market marketing member nostre officer operator platform posizionamento premio product prodotti professional project ready relazioni researcher retail security service servizi solution soluzioni specialist strategia strategie strategy suite team technology tocca toolkit ui ux valore".split(" "));
const stopWords = new Set("about after also and are been being business can company could from have into more most not our product services software solution that the their them they this through use using was were what when where which will with your you per una che con del della delle dei gli nel nella non più sua suo".split(" "));
const audienceNoise = new Set("azienda aziende business ceo chief commercial commerciale commerciali company companies cto direttore direttori director founder founders head imprese manager responsabile responsabili sales societa società team teams vice president vp".split(" "));

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
function decodeVisibleText(value: string) {
  return decodeHtml(value)
    .replace(/&apos;/g, "'").replace(/&bull;/g, "•")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}
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

function normalizedText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const discoveryChannelDefinitions: DiscoveryChannelDefinition[] = [
  { id: "europages", label: "Europages", category: "marketplace", purpose: "company_discovery", hosts: ["europages.com"], priority: 1, query: (intent, territory) => `site:europages.com ${intent} ${territory}` },
  { id: "wlw", label: "Wer liefert was (wlw)", category: "marketplace", purpose: "company_discovery", hosts: ["wlw.de", "wlw.at", "wlw.ch"], priority: 2, query: (intent) => `site:wlw.de ${intent} anbieter` },
  { id: "netcomm", label: "Netcomm", category: "ecosystem", purpose: "company_discovery", hosts: ["consorzionetcomm.it"], priority: 2, query: (intent) => `site:consorzionetcomm.it/soci ${intent}` },
  { id: "eu-startups", label: "EU-Startups", category: "ecosystem", purpose: "company_discovery", hosts: ["eu-startups.com"], priority: 3, query: (intent, territory) => `site:eu-startups.com/directory ${intent} ${territory}` },
  { id: "ice", label: "ICE / Italian Trade Agency", category: "institutional", purpose: "company_discovery", hosts: ["ice.it"], priority: 4, query: (intent) => `site:ice.it "find your italian partner" ${intent}` },
  { id: "xing", label: "XING aziende", category: "network", purpose: "company_signal", hosts: ["xing.com"], priority: 4, query: (intent, territory) => `site:xing.com/pages ${intent} ${territory}` },
  { id: "viadeo", label: "Viadeo aziende", category: "network", purpose: "company_signal", hosts: ["viadeo.journaldunet.com"], priority: 4, query: (intent) => `site:viadeo.journaldunet.com ${intent} entreprise` },
  { id: "developers-italia", label: "Developers Italia", category: "community", purpose: "company_signal", hosts: ["developers.italia.it"], priority: 5, query: (intent) => `site:developers.italia.it ${intent}` },
  { id: "codemotion", label: "Codemotion", category: "community", purpose: "company_signal", hosts: ["community.codemotion.com", "codemotion.com"], priority: 5, query: (intent) => `site:community.codemotion.com ${intent}` },
  { id: "startup-europe", label: "Startup Europe", category: "institutional", purpose: "company_signal", hosts: ["digital-strategy.ec.europa.eu"], priority: 6, query: (intent) => `site:digital-strategy.ec.europa.eu "startup europe" ${intent}` },
  { id: "unioncamere", label: "Unioncamere / Registro Imprese", category: "institutional", purpose: "territory_validation", hosts: ["unioncamere.gov.it", "registroimprese.it"], priority: 7, query: (intent) => `site:registroimprese.it ${intent}` },
];

function discoveryChannelsFor(intent: string, territory: string) {
  const market = normalizedText(territory), context = normalizedText(intent);
  const italy = /\b(italia|italian|italy)\b/.test(market);
  const dach = /\b(dach|deutschland|germania|germany|osterreich|austria|schweiz|svizzera|switzerland)\b/.test(market);
  const france = /\b(france|francia|french)\b/.test(market);
  const europe = !market || /\b(eu|europa|europe|european union|unione europea)\b/.test(market) || italy || dach || france;
  const tech = /\b(ai|api|cloud|cyber|data|deep tech|developer|digit|e-?commerce|fintech|platform|saas|software|startup|tech)\b/.test(context);
  const industrial = /\b(export|fabbric|industr|manufactur|packag|prodot|supplier|fornitor)\b/.test(context);
  const publicDigital = /\b(agid|civic|open source|pa|pubblic|public sector|spid)\b/.test(context);
  const selected = discoveryChannelDefinitions.filter((channel) => {
    if (channel.id === "europages") return europe;
    if (channel.id === "wlw") return dach || (europe && industrial);
    if (channel.id === "netcomm" || channel.id === "ice" || channel.id === "unioncamere") return italy;
    if (channel.id === "eu-startups" || channel.id === "startup-europe") return europe && tech;
    if (channel.id === "xing") return dach;
    if (channel.id === "viadeo") return france;
    if (channel.id === "developers-italia") return italy && publicDigital;
    if (channel.id === "codemotion") return europe && tech;
    return false;
  });
  return selected.sort((left, right) => left.priority - right.priority).slice(0, 8);
}

function contextSourcesFor(intent: string, territory: string): DiscoveryContextSource[] {
  const market = normalizedText(territory), context = normalizedText(intent), sources: DiscoveryContextSource[] = [];
  const italy = /\b(italia|italian|italy)\b/.test(market);
  if (italy) sources.push({ id: "osservatori", label: "Osservatori.net", purpose: "market_context" });
  if (italy && /\b(developer|digit|open source|saas|software|startup|tech)\b/.test(context)) sources.push({ id: "italian-tech-communities", label: "Community tech italiane", purpose: "community_mapping" });
  return sources;
}

function channelForUrl(value: string) {
  const host = hostOf(value);
  return discoveryChannelDefinitions.find((channel) => channel.hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`)));
}

function audienceTerms(value: string) {
  const terms = normalizedText(value).match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [];
  return [...new Set(terms.filter((term) => (term.length >= 3 || term === "b2b") && !audienceNoise.has(term) && !stopWords.has(term)).map((term) => term === "saas" ? "software" : term))].slice(0, 5);
}

function inferredBuyer(analysis: WebsiteAnalysis) {
  const context = normalizedText(`${analysis.title} ${analysis.summary} ${analysis.keywords.join(" ")}`);
  if (/outbound|prospect|lead|sales|vendit|email|crm/.test(context)) return "software B2B SaaS";
  if (/e-?commerce|negozi|retail|shop/.test(context)) return "ecommerce retail";
  if (/recruit|assunz|talent|risorse umane|human resources/.test(context)) return "aziende risorse umane";
  if (/ristor|food|hospitality|hotel/.test(context)) return "ristorazione ospitalità";
  return analysis.keywords.slice(0, 3).join(" ") || analysis.summary.slice(0, 80);
}

function companyMatchesAudience(html: string, terms: string[]) {
  if (!terms.length) return true;
  const haystack = normalizedText(textFromHtml(html).slice(0, 40_000));
  const synonyms: Record<string, string[]> = {
    b2b: ["b2b", "business-to-business", "business to business", "enterprise software", "for businesses", "per aziende"],
    ecommerce: ["ecommerce", "e-commerce", "online store", "negozio online"],
    retail: ["retail", "commercio", "negozi"],
    software: ["software", "saas", "cloud platform", "piattaforma cloud", "piattaforma software"],
  };
  const matches = terms.filter((term) => (synonyms[term] ?? [term]).some((candidate) => haystack.includes(candidate))).length;
  return matches >= Math.min(2, terms.length);
}

function companyMatchesTerritory(url: string, html: string, territory: string) {
  const requested = normalizedText(territory).replace(/\s+/g, " ").trim();
  if (!requested || /^(?:eu|europa|europe|european union|unione europea)$/.test(requested)) return true;
  const host = hostOf(url);
  const pageText = normalizedText(textFromHtml(html).slice(0, 20_000));
  const profiles = [
    { request: /\bdach\b/, domains: [".de", ".at", ".ch"], evidence: /\b(austria|deutschland|germany|osterreich|schweiz|switzerland|berlin|frankfurt|hamburg|munchen|munich|vienna|wien|zurich)\b/ },
    { request: /\b(italia|italian|italy)\b/, domains: [".it"], evidence: /\b(italia|italian|italy|bologna|firenze|florence|milan|milano|napoli|rome|roma|torino|turin|venezia|venice)\b/ },
    { request: /\b(deutschland|germania|germany)\b/, domains: [".de"], evidence: /\b(deutschland|germania|germany|berlin|frankfurt|hamburg|munchen|munich)\b/ },
    { request: /\b(austria|osterreich)\b/, domains: [".at"], evidence: /\b(austria|osterreich|vienna|wien|graz|linz|salzburg)\b/ },
    { request: /\b(schweiz|svizzera|switzerland)\b/, domains: [".ch"], evidence: /\b(schweiz|svizzera|switzerland|basel|bern|geneva|ginevra|lausanne|zurich)\b/ },
    { request: /\b(france|francia|french)\b/, domains: [".fr"], evidence: /\b(france|francia|french|lille|lyon|marseille|nantes|paris|toulouse)\b/ },
    { request: /\b(spagna|spain|spanish)\b/, domains: [".es"], evidence: /\b(barcelona|madrid|spagna|spain|spanish|valencia)\b/ },
    { request: /\b(portogallo|portugal|portuguese)\b/, domains: [".pt"], evidence: /\b(lisbon|lisboa|porto|portogallo|portugal|portuguese)\b/ },
    { request: /\b(benelux|belgio|belgium|netherlands|olanda|luxembourg|lussemburgo)\b/, domains: [".be", ".nl", ".lu"], evidence: /\b(amsterdam|belgio|belgium|brussels|bruxelles|luxembourg|lussemburgo|netherlands|olanda|rotterdam)\b/ },
  ];
  const profile = profiles.find((candidate) => candidate.request.test(requested));
  if (profile) return profile.domains.some((suffix) => host.endsWith(suffix)) || profile.evidence.test(pageText);
  const terms = requested.match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  return terms.length > 0 && terms.every((term) => pageText.includes(term));
}

function looksLikePublisherOrDirectory(analysis: WebsiteAnalysis, html = "") {
  const description = normalizedText(`${analysis.title} ${analysis.summary}`), body = normalizedText(textFromHtml(html).slice(0, 8_000));
  const publisherIdentity = /\b(news|notizie|quotidiano|magazine|giornale|recensioni|reviews|directory|comparatore|registro imprese|visure|camera di commercio|elenco aziende)\b/.test(description);
  const directoryPage = /\b(business directory|directory of|directory software|european b2b directory|elenco aziende|registro imprese|camera di commercio|portale di aziende)\b/.test(body);
  return publisherIdentity || directoryPage;
}

function plausiblePerson(person: { firstName: string; lastName: string }) {
  const rawName = decodeVisibleText(`${person.firstName} ${person.lastName}`).replace(/\s+/g, " ").trim();
  const fullName = normalizedText(rawName), tokens = fullName.match(/[a-z]+/g) ?? [], rawTokens = rawName.split(/\s+/);
  const nameParticles = new Set(["da", "de", "degli", "del", "della", "di", "la", "lo", "van", "von"]);
  if (!person.firstName.trim() || !person.lastName.trim() || fullName.length > 80 || tokens.length < 2 || tokens.length > 4) return false;
  if (/[0-9@<>{}|/&•]/.test(rawName) || rawTokens.some((token) => !/^[\p{L}][\p{L}'’.-]*$/u.test(token))) return false;
  if (!rawTokens.every((token) => nameParticles.has(normalizedText(token)) || /^[A-ZÀ-ÖØ-Þ][\p{L}'’.-]*$/u.test(token) || /^[A-ZÀ-ÖØ-Þ.-]{2,}$/u.test(token))) return false;
  return !tokens.some((token) => nonPersonTokens.has(token) || ["admin", "anonymous", "anonimo", "editorial", "imprese", "redazione", "staff", "utente", "inc", "ltd", "llc", "sas", "spa", "srl"].includes(token));
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
  const resultHrefs = [
    ...[...html.matchAll(/<li[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>[\s\S]{0,4000}?<a[^>]+href=["']([^"']+)["']/gi)].map((match) => match[1]),
    ...[...html.matchAll(/<a[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]),
    ...[...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\bresult__a\b[^"']*["']/gi)].map((match) => match[1]),
    ...[...html.matchAll(/<div[^>]*class=["'][^"']*\bcompTitle\b[^"']*["'][^>]*>[\s\S]{0,1800}?<a[^>]+href=["']([^"']+)["']/gi)].map((match) => match[1]),
  ];
  for (const rawHref of resultHrefs) {
    let href = decodeHtml(rawHref);
    try {
      const parsed = new URL(href, "https://html.duckduckgo.com");
      href = parsed.searchParams.get("uddg") ?? href;
      const bingTarget = parsed.searchParams.get("u");
      if (bingTarget?.startsWith("a1")) try { href = Buffer.from(bingTarget.slice(2), "base64").toString("utf8"); } catch { /* Ignore malformed redirect targets. */ }
      const yahooTarget = parsed.pathname.match(/\/RU=([^/]+)\/RK=/i)?.[1];
      if (yahooTarget) href = decodeURIComponent(yahooTarget);
      const target = new URL(href);
      const host = hostOf(target.href);
      if (target.protocol.startsWith("http") && host && ![...blockedHosts].some((x) => host === x || host.endsWith(`.${x}`))) urls.push(target.origin + target.pathname);
    } catch { /* Ignore relative/search links. */ }
  }
  return [...new Set(urls)];
}

function externalCompanyLinks(html: string, base: string) {
  const links: string[] = [], baseHost = registrableHost(hostOf(base));
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)) try {
    const target = new URL(decodeHtml(match[1]), base), host = hostOf(target.href), companyHost = registrableHost(host);
    const isBlocked = [...blockedHosts].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
    const isAsset = /\.(?:avif|css|docx?|gif|ico|jpe?g|js|json|pdf|png|svg|webp|xlsx?|xml|zip)$/i.test(target.pathname);
    if (!/^https?:$/.test(target.protocol) || !companyHost || companyHost === baseHost || isBlocked || isAsset) continue;
    links.push(target.origin);
  } catch { /* Ignore malformed and non-HTTP links. */ }
  return [...new Set(links)].slice(0, 16);
}
function prioritizedExternalCompanyLinks(html: string, base: string) {
  const links = externalCompanyLinks(html, base), preferred: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) try {
    const label = normalizedText(textFromHtml(match[2])).trim();
    if (!/\b(company website|homepage|official site|official website|site officiel|sito ufficiale|sito web|visit website|visita il sito|website|zur website)\b/.test(label)) continue;
    const origin = new URL(decodeHtml(match[1]), base).origin;
    const known = links.find((candidate) => candidate === origin);
    if (known) preferred.push(known);
  } catch { /* Ignore malformed source links. */ }
  return [...new Set([...preferred, ...links])];
}
function plausibleCompanyPage(value: string) {
  try {
    const path = new URL(value).pathname.toLowerCase(), segments = path.split("/").filter(Boolean);
    if (!segments.length) return true;
    const companyPage = /^(?:about|about-us|azienda|chi-siamo|company|contact|contacts|contatti|direzione|fondatori|founders|leadership|management|our-team|people|persone|squadra|staff|team|who-we-are)$/;
    return segments.length <= 2 && segments.some((segment) => companyPage.test(segment));
  } catch { return false; }
}
function publicPageLinks(html: string, base: string) {
  const links: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) try {
    const url = new URL(decodeHtml(match[1]), base);
    const label = normalizedText(textFromHtml(match[2])).trim(), segments = url.pathname.toLowerCase().split("/").filter(Boolean);
    const pageHint = /^(?:about|about-us|azienda|chi-siamo|company|contact|contacts|contatti|direzione|fondatori|founders|leadership|management|our-team|people|persone|squadra|staff|team|who-we-are)$/;
    const labelHint = /^(?:about(?: us)?|azienda|chi siamo|company|contact(?: us)?|contatti|direzione|fondatori|founders|leadership|management|our team|people|persone|squadra|staff|team|who we are)$/;
    if (hostOf(url.href) === hostOf(base) && (segments.some((segment) => pageHint.test(segment)) || labelHint.test(label))) links.push(url.href);
  } catch { /* Ignore malformed links. */ }
  return [...new Set(links)].slice(0, 5);
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

function peopleFromVisiblePage(html: string) {
  const people: Array<{ firstName: string; lastName: string; role?: string }> = [], seen = new Set<string>();
  const rolePattern = /\b(account|amministr|business development|ceo|chief|commercial|consultant|cto|developer|director|engineer|founder|head|lead|manager|marketing|operations|owner|president|sales|specialist|svilupp|vendit)\b/i;
  const plausibleRole = (value: string) => {
    const normalized = normalizedText(value), words = normalized.match(/[a-z0-9]+/g) ?? [];
    if (value.length > 80 || words.length > 8 || /[0-9@•]|https?:|&(?:[a-z]+|#\d+);/i.test(value)) return false;
    return !words.some((word) => ["abbiamo", "affianchiamo", "aiutiamo", "collaboriamo", "consumer", "corsi", "corso", "costruiamo", "metodo", "offriamo", "ready", "scopri", "supportiamo", "sviluppiamo", "toolkit", "trasformiamo"].includes(word));
  };
  const add = (name: string, role?: string) => {
    const cleanName = decodeVisibleText(textFromHtml(name)).replace(/\s+/g, " ").trim(), bits = cleanName.split(/\s+/);
    const cleanRole = role ? decodeVisibleText(textFromHtml(role)).replace(/\s+/g, " ").trim() : undefined;
    if (bits.length < 2 || bits.length > 4 || !cleanRole || !rolePattern.test(cleanRole) || !plausibleRole(cleanRole)) return;
    const person = { firstName: bits[0], lastName: bits.slice(1).join(" "), role: cleanRole };
    const key = normalizedText(cleanName); if (seen.has(key) || !plausiblePerson(person)) return;
    seen.add(key); people.push(person);
  };
  for (const image of html.matchAll(/<img[^>]+alt=["']([^"']+)["'][^>]*>/gi)) {
    const name = decodeVisibleText(image[1]), fragment = html.slice(image.index ?? 0, (image.index ?? 0) + 7_000);
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const card = fragment.match(new RegExp(`>\\s*${escapedName}\\s*<\\/[^>]+>\\s*<[^>]+>\\s*([^<]{2,100})\\s*<\\/`, "i"));
    if (card) add(name, card[1]);
  }
  for (const card of html.matchAll(/<(h[2-6]|strong|p)[^>]*>([^<]{3,80})<\/\1>\s*<(?:p|span|div)[^>]*>([^<]{2,100})<\/(?:p|span|div)>/gi)) add(card[2], card[3]);
  const leafItems = [...html.matchAll(/<(h[1-6]|p|span|strong|div)[^>]*>\s*([^<>]{2,120})\s*<\/\1>|<\/(?:article|li|section)>/gi)]
    .map((match) => match[2] ? decodeVisibleText(match[2]).replace(/\s+/g, " ").trim() : null);
  for (let index = 0; index < leafItems.length - 1; index += 1) {
    const current = leafItems[index], next = leafItems[index + 1];
    if (current && next && rolePattern.test(next)) add(current, next);
  }
  for (let index = 0; index < leafItems.length - 1; index += 1) {
    const current = leafItems[index], next = leafItems[index + 1];
    if (current && next && rolePattern.test(current)) add(next, current);
  }
  return people;
}

function desiredRoleTerms(audience: string) {
  const value = normalizedText(audience);
  if (/sales|commercial|vendit|revenue/.test(value)) return ["sales", "commercial", "vendit", "business develop", "revenue", "managing director", "founder", "ceo"];
  if (/marketing|growth|comunicaz/.test(value)) return ["marketing", "growth", "comunicaz", "managing director", "founder", "ceo"];
  if (/tech|technical|cto|developer|svilupp/.test(value)) return ["cto", "technical", "developer", "svilupp", "engineer", "founder"];
  return ["founder", "ceo", "owner", "director", "manager"];
}
function personFromEmail(email: string) {
  const local = email.split("@")[0], bits = local.split(/[._-]+/).filter(Boolean);
  if (bits.length < 2 || bits.length > 4 || !bits.every((x) => /^[a-z]{2,}$/i.test(x)) || bits.some((x) => genericMailboxTokens.has(x.toLowerCase()))) return null;
  return { firstName: titleCase(bits[0]), lastName: titleCase(bits.slice(1).join(" ")) };
}

async function prospectsFromCompany(companyUrl: string, fetcher: typeof fetch, relevanceTerms: string[], preferredRoles: string[], territory: string): Promise<PublicProspect[]> {
  const target = new URL(companyUrl), home = await fetchHtml(target.origin, fetcher), domain = hostOf(home.url), homeAnalysis = await analyzeWebsite(home.url, async () => new Response(home.html, { status: 200 }));
  if (looksLikePublisherOrDirectory(homeAnalysis, home.html) || !companyMatchesTerritory(home.url, `${homeAnalysis.title} ${homeAnalysis.summary} ${home.html}`, territory) || !companyMatchesAudience(`${homeAnalysis.title} ${homeAnalysis.summary} ${home.html}`, relevanceTerms)) return [];
  const titleName = homeAnalysis.title.split(/[|–—-]/)[0]?.trim(), companyName = /^(?:brainpress|wordpress)$/i.test(homeAnalysis.name) || homeAnalysis.name.length > 60 ? (titleName.length <= 60 ? titleName : titleCase(domain.split(".")[0])) : homeAnalysis.name;
  const linkedPages = publicPageLinks(home.html, home.url);
  const commonPages = linkedPages.length >= 3 ? [] : ["/about", "/team", "/chi-siamo", "/contatti"].map((path) => new URL(path, home.url).href);
  const pageUrls = [...new Set([...(target.pathname !== "/" ? [companyUrl] : []), ...linkedPages, ...commonPages])].filter((url) => url !== home.url).slice(0, 5);
  const fetched = await Promise.allSettled(pageUrls.map((url) => fetchHtml(url, fetcher)));
  const pages = [{ url: home.url, html: home.html }, ...fetched.filter((row): row is PromiseFulfilledResult<{ url: string; html: string }> => row.status === "fulfilled").map((row) => row.value)];
  const found: PublicProspect[] = [], seen = new Set<string>();
  for (const page of pages) {
    const visiblePageText = normalizedText(textFromHtml(page.html).slice(0, 80_000));
    if (/lorem ipsum|team member element|demo content|sample team/.test(visiblePageText)) continue;
    const publishedEmails = extractEmails(page.html, domain);
    const people = [...peopleFromJsonLd(page.html), ...peopleFromVisiblePage(page.html)]
      .filter((person, index, all) => all.findIndex((candidate) => normalizedText(`${candidate.firstName} ${candidate.lastName}`) === normalizedText(`${person.firstName} ${person.lastName}`)) === index)
      .sort((left, right) => preferredRoles.filter((term) => normalizedText(right.role ?? "").includes(term)).length - preferredRoles.filter((term) => normalizedText(left.role ?? "").includes(term)).length)
      .slice(0, 3);
    for (const person of people) {
      if (!plausiblePerson(person)) continue;
      const first = clean(person.firstName), last = clean(person.lastName);
      const publishedCandidate = publishedEmails.find(({ email }) => {
        const local = clean(email.split("@")[0]);
        return [`${first}${last}`, `${first[0]}${last}`, `${first}${last[0]}`].includes(local);
      });
      const candidate = publishedCandidate ?? generateCandidates({ ...person, domain })[0]; if (!candidate || seen.has(candidate.email)) continue;
      seen.add(candidate.email);
      found.push({ ...person, domain, ...(publishedCandidate ? { knownEmail: candidate.email } : {}), email: candidate.email, companyName, confidence: publishedCandidate ? candidate.confidence : 0.68, verification: publishedCandidate ? "valid" : "risky", source: publishedCandidate ? "public_page" : "owned_pattern", sourceUrl: page.url, evidence: publishedCandidate ? "Email e persona pubblicate sul sito aziendale" : "Persona pubblicata sul sito ufficiale; indirizzo costruito con lo schema più comune e marcato da verificare" });
    }
    for (const candidate of publishedEmails) {
      if (seen.has(candidate.email)) continue;
      const local = candidate.email.split("@")[0].toLowerCase(); if (genericMailboxes.has(local) || !/[._-]/.test(local)) continue;
      const person = personFromEmail(candidate.email); if (!person) continue; seen.add(candidate.email);
      found.push({ ...person, domain, knownEmail: candidate.email, email: candidate.email, companyName, confidence: candidate.confidence, verification: "valid", source: "public_page", sourceUrl: page.url, evidence: "Email pubblicata sul sito aziendale" });
    }
  }
  const roleScore = (prospect: PublicProspect) => preferredRoles.filter((term) => normalizedText(prospect.role ?? "").includes(term)).length;
  return found.sort((left, right) => roleScore(right) * 4 + (right.verification === "valid" ? 2 : 0) - (roleScore(left) * 4 + (left.verification === "valid" ? 2 : 0)));
}

export async function discoverPublicProspects(input: { url: string; audience?: string; territory?: string; limit?: number }, fetcher: typeof fetch = fetch) {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const discoveryBudgetMs = Math.min(55_000, 32_000 + limit * 700);
  const expansionLimit = Math.min(18, Math.max(10, Math.ceil(limit * 0.8)));
  const companyLimit = Math.min(42, Math.max(24, limit * 2));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Discovery time budget reached")), discoveryBudgetMs);
  const boundedFetcher = ((resource: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => fetcher(resource, { ...init, signal: init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal })) as typeof fetch;
  const timedFetcher = (timeoutMs: number) => ((resource: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const requestSignal = AbortSignal.timeout(timeoutMs);
    return boundedFetcher(resource, { ...init, signal: init?.signal ? AbortSignal.any([requestSignal, init.signal]) : requestSignal });
  }) as typeof fetch;
  try {
    const analysis = await analyzeWebsite(input.url, timedFetcher(12_000)), sourceHost = hostOf(analysis.url);
    const requestedAudience = input.audience?.trim() || "", inferred = inferredBuyer(analysis), requestedTerms = audienceTerms(requestedAudience);
    const researchIntent = requestedTerms.length ? requestedAudience : inferred;
    const relevanceTerms = audienceTerms(researchIntent), coreIntent = relevanceTerms.join(" ") || researchIntent, preferredRoles = desiredRoleTerms(requestedAudience || researchIntent);
    const territory = input.territory?.trim() || "Europa", normalizedTerritory = normalizedText(territory), italianMarket = /\b(italia|italian|italy)\b/.test(normalizedTerritory);
    const query = `${requestedAudience || inferred} · ${territory}`;
    const marketScope = italianMarket ? "site:.it" : /\bdach\b/.test(normalizedTerritory) ? "(site:.de OR site:.at OR site:.ch)" : /\b(france|francia|french)\b/.test(normalizedTerritory) ? "site:.fr" : "";
    const roleQuery = preferredRoles.includes("sales") ? '("Sales Director" OR "direttore commerciale")' : preferredRoles.includes("marketing") ? '("Marketing Director" OR "direttore marketing")' : preferredRoles.includes("cto") ? '("CTO" OR "direttore tecnico")' : "founder CEO";
    const channels = discoveryChannelsFor(researchIntent, territory), contextSources = contextSourcesFor(researchIntent, territory);
    const queries = [...new Set([
      `${marketScope} ${coreIntent} azienda`,
      `${marketScope} ${coreIntent} ${roleQuery}`,
      `${coreIntent} companies ${territory}`,
      `${marketScope} ${coreIntent} team leadership ${roleQuery}`,
      `${marketScope} ${coreIntent} "chi siamo" ${roleQuery}`,
    ])].slice(0, 5);
    const searchRequests: Array<{ url: string; channelId?: string }> = [
      ...channels.map((channel) => ({ url: `https://search.yahoo.com/search?p=${encodeURIComponent(channel.query(coreIntent, territory))}`, channelId: channel.id })),
      ...queries.flatMap((value) => [
        { url: `https://www.bing.com/search?q=${encodeURIComponent(value)}` },
        { url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(value)}` },
        { url: `https://search.yahoo.com/search?p=${encodeURIComponent(value)}` },
      ]),
    ];
    const searchFetcher = timedFetcher(10_000);
    const searchRows = await Promise.allSettled(searchRequests.map(async (request) => ({ ...(await fetchHtml(request.url, searchFetcher)), channelId: request.channelId })));
    const foundResults: Array<{ url: string; channelId?: string }> = [], channelResults = new Map<string, number>();
    for (const row of searchRows) if (row.status === "fulfilled") for (const url of searchUrls(row.value.html)) {
      const channelId = channelForUrl(url)?.id ?? row.value.channelId;
      if (channelId) channelResults.set(channelId, (channelResults.get(channelId) ?? 0) + 1);
      foundResults.push({ url, channelId });
    }
    const orderedResults: Array<{ url: string; channelId?: string }> = [], seenResults = new Set<string>();
    for (const result of [...foundResults.filter(({ url }) => Boolean(channelForUrl(url))), ...foundResults.filter(({ url }) => !channelForUrl(url))]) {
      if (seenResults.has(result.url)) continue;
      seenResults.add(result.url); orderedResults.push(result);
    }
    const expansionTargets: Array<{ url: string; channelId?: string }> = [], seenExpansionHosts = new Set<string>();
    for (const result of orderedResults) {
      const { url } = result, sourceChannel = channelForUrl(url), candidateHost = registrableHost(hostOf(url));
      if (!candidateHost || candidateHost === registrableHost(sourceHost) || (!sourceChannel && plausibleCompanyPage(url)) || seenExpansionHosts.has(candidateHost)) continue;
      seenExpansionHosts.add(candidateHost); expansionTargets.push({ url, channelId: sourceChannel?.id ?? result.channelId });
      if (expansionTargets.length >= expansionLimit) break;
    }
    const expansionFetcher = timedFetcher(12_000);
    const expansionRows = await Promise.allSettled(expansionTargets.map(async (target) => ({ ...(await fetchHtml(target.url, expansionFetcher)), channelId: target.channelId })));
    const expandedUrls: string[] = [];
    for (const row of expansionRows) if (row.status === "fulfilled") {
      const externalLinks = prioritizedExternalCompanyLinks(row.value.html, row.value.url);
      if (row.value.channelId && externalLinks.length) channelResults.set(row.value.channelId, Math.max(channelResults.get(row.value.channelId) ?? 0, externalLinks.length));
      expandedUrls.push(...externalLinks);
    }
    const companyUrls: string[] = [], seenCompanies = new Set<string>();
    const directUrls = orderedResults
      .filter(({ url }) => !channelForUrl(url) && plausibleCompanyPage(url))
      .map(({ url }) => url)
      .sort((left, right) => {
        const pageScore = (value: string) => /\/(?:direzione|founders?|leadership|management|our-team|people|persone|squadra|staff|team)(?:\/|$)/i.test(new URL(value).pathname) ? 2 : new URL(value).pathname === "/" ? 0 : 1;
        return pageScore(right) - pageScore(left);
      });
    for (const url of [...directUrls, ...expandedUrls]) {
      const companyHost = registrableHost(hostOf(url));
      if (!companyHost || channelForUrl(url) || companyHost === registrableHost(sourceHost) || seenCompanies.has(companyHost)) continue;
      seenCompanies.add(companyHost); companyUrls.push(url);
      if (companyUrls.length >= companyLimit) break;
    }
    const prospects: PublicProspect[] = [];
    const rows: PromiseSettledResult<PublicProspect[]>[] = [], companyFetcher = timedFetcher(12_000);
    for (let start = 0; start < companyUrls.length && !controller.signal.aborted; start += 8) {
      const batchRows = await Promise.allSettled(companyUrls.slice(start, start + 8).map((url) => prospectsFromCompany(url, companyFetcher, relevanceTerms, preferredRoles, territory)));
      rows.push(...batchRows);
      for (const row of batchRows) if (row.status === "fulfilled") for (const prospect of row.value) if (!prospects.some((candidate) => candidate.email === prospect.email)) prospects.push(prospect);
      if (prospects.length >= limit) break;
    }
    const roleScore = (prospect: PublicProspect) => preferredRoles.filter((term) => normalizedText(prospect.role ?? "").includes(term)).length;
    const rankedAll = prospects.sort((left, right) => roleScore(right) * 4 + (right.verification === "valid" ? 2 : 0) - (roleScore(left) * 4 + (left.verification === "valid" ? 2 : 0)));
    const roleMatched = rankedAll.filter((prospect) => roleScore(prospect) > 0), ranked = roleMatched.length ? roleMatched : rankedAll;
    const diversified: PublicProspect[] = [];
    for (let companyQuota = 1; companyQuota <= 3 && diversified.length < limit; companyQuota += 1) for (const prospect of ranked) {
      if (diversified.includes(prospect) || diversified.filter((candidate) => candidate.domain === prospect.domain).length >= companyQuota) continue;
      diversified.push(prospect); if (diversified.length >= limit) break;
    }
    return {
      analysis,
      query,
      prospects: diversified,
      sourcesScanned: rows.length,
      partial: controller.signal.aborted || searchRows.some((row) => row.status === "rejected") || expansionRows.some((row) => row.status === "rejected") || rows.some((row) => row.status === "rejected"),
      strategy: {
        channels: channels.map(({ id, label, category, purpose }) => ({ id, label, category, purpose, resultsFound: (channelResults.get(id) ?? 0) > 0 })),
        contextSources,
        contactPolicy: "official_company_sites_only" as const,
      },
    };
  } finally { clearTimeout(timer); }
}
