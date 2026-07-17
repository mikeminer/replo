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

const blockedHosts = new Set(["duckduckgo.com", "google.com", "bing.com", "yahoo.com", "yimg.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "wikipedia.org", "indeed.com", "glassdoor.com", "crunchbase.com", "g2.com", "trustpilot.com", "yelp.com", "reddit.com", "topconsumerreviews.com"]);
const genericMailboxes = new Set(["admin", "billing", "careers", "contact", "hello", "info", "jobs", "legal", "marketing", "office", "press", "privacy", "sales", "support", "team"]);
const genericMailboxTokens = new Set(["account", "accounts", "anonymous", "anonimo", "care", "complaint", "complaints", "consumer", "consumerrelations", "customer", "customers", "customerservice", "editorial", "enquiry", "enquiries", "help", "imprese", "inquiry", "media", "redazione", "relations", "service", "services", "webmaster"]);
const nonPersonTokens = new Set("about advantage agency ai animalia artificial azienda brands business certificazioni chief commission company contact contacts corsi course data dettagli director ecommerce experience featured group gruppo innovation intelligence investor longevity management manager managing market marketing member nostre officer operator platform posizionamento premio product prodotti professional project ready relazioni retail security service servizi solution soluzioni strategia strategie strategy suite team technology tocca toolkit valore".split(" "));
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
  if (!/ital|italy/i.test(territory)) return true;
  const host = hostOf(url); if (host.endsWith(".it")) return true;
  const pageText = normalizedText(textFromHtml(html).slice(0, 20_000));
  return /\b(italia|italian|italy|bologna|firenze|florence|milan|milano|napoli|rome|roma|torino|turin|venezia|venice)\b/.test(pageText);
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Discovery time budget reached")), 18_000);
  const boundedFetcher = ((resource: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => fetcher(resource, { ...init, signal: init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal })) as typeof fetch;
  try {
    const analysis = await analyzeWebsite(input.url, boundedFetcher), sourceHost = hostOf(analysis.url), limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
    const requestedAudience = input.audience?.trim() || "", inferred = inferredBuyer(analysis), requestedTerms = audienceTerms(requestedAudience);
    const researchIntent = requestedTerms.length ? requestedAudience : inferred;
    const relevanceTerms = audienceTerms(researchIntent), coreIntent = relevanceTerms.join(" ") || researchIntent, preferredRoles = desiredRoleTerms(requestedAudience || researchIntent);
    const territory = input.territory?.trim() || "Europa", italianMarket = /ital|italy/i.test(territory), broadTerritory = italianMarket ? "Europa" : "";
    const query = `${requestedAudience || inferred} · ${territory}`;
    const marketScope = italianMarket ? "site:.it" : "";
    const roleQuery = preferredRoles.includes("sales") ? '("Sales Director" OR "direttore commerciale")' : preferredRoles.includes("marketing") ? '("Marketing Director" OR "direttore marketing")' : preferredRoles.includes("cto") ? '("CTO" OR "direttore tecnico")' : "founder CEO";
    const queries = [...new Set([
      `${marketScope} ${coreIntent} azienda`,
      `${marketScope} ${coreIntent} founder team`,
      `${marketScope} ${coreIntent} ${roleQuery}`,
      `${coreIntent} ${territory} aziende`,
      ...(broadTerritory ? [`${coreIntent} ${broadTerritory} companies`] : [`${coreIntent} companies ${territory}`]),
    ])].slice(0, 5);
    const searchRequests = queries.flatMap((value) => [
      `https://www.bing.com/search?q=${encodeURIComponent(value)}`,
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(value)}`,
      `https://search.yahoo.com/search?p=${encodeURIComponent(value)}`,
    ]);
    const foundUrls: string[] = [];
    const searchRows = await Promise.allSettled(searchRequests.map((url) => fetchHtml(url, boundedFetcher)));
    for (const row of searchRows) if (row.status === "fulfilled") foundUrls.push(...searchUrls(row.value.html));
    const expansionUrls: string[] = [], seenExpansionHosts = new Set<string>();
    for (const url of foundUrls) {
      const candidateHost = registrableHost(hostOf(url));
      if (!candidateHost || candidateHost === registrableHost(sourceHost) || plausibleCompanyPage(url) || seenExpansionHosts.has(candidateHost)) continue;
      seenExpansionHosts.add(candidateHost); expansionUrls.push(url);
      if (expansionUrls.length >= 6) break;
    }
    const expansionRows = await Promise.allSettled(expansionUrls.map((url) => fetchHtml(url, boundedFetcher)));
    const expandedUrls: string[] = [];
    for (const row of expansionRows) if (row.status === "fulfilled") expandedUrls.push(...externalCompanyLinks(row.value.html, row.value.url));
    const companyUrls: string[] = [], seenCompanies = new Set<string>();
    for (const url of [...foundUrls.filter(plausibleCompanyPage), ...expandedUrls]) {
      const companyHost = registrableHost(hostOf(url));
      if (!companyHost || companyHost === registrableHost(sourceHost) || seenCompanies.has(companyHost)) continue;
      seenCompanies.add(companyHost); companyUrls.push(url);
      if (companyUrls.length >= 18) break;
    }
    const prospects: PublicProspect[] = [];
    const rows = await Promise.allSettled(companyUrls.map((url) => prospectsFromCompany(url, boundedFetcher, relevanceTerms, preferredRoles, territory)));
    for (const row of rows) if (row.status === "fulfilled") for (const prospect of row.value) if (!prospects.some((x) => x.email === prospect.email)) prospects.push(prospect);
    const roleScore = (prospect: PublicProspect) => preferredRoles.filter((term) => normalizedText(prospect.role ?? "").includes(term)).length;
    const rankedAll = prospects.sort((left, right) => roleScore(right) * 4 + (right.verification === "valid" ? 2 : 0) - (roleScore(left) * 4 + (left.verification === "valid" ? 2 : 0)));
    const roleMatched = rankedAll.filter((prospect) => roleScore(prospect) > 0), ranked = roleMatched.length ? roleMatched : rankedAll;
    const diversified: PublicProspect[] = [];
    for (let companyQuota = 1; companyQuota <= 3 && diversified.length < limit; companyQuota += 1) for (const prospect of ranked) {
      if (diversified.includes(prospect) || diversified.filter((candidate) => candidate.domain === prospect.domain).length >= companyQuota) continue;
      diversified.push(prospect); if (diversified.length >= limit) break;
    }
    return { analysis, query, prospects: diversified, sourcesScanned: companyUrls.length, partial: searchRows.some((row) => row.status === "rejected") || expansionRows.some((row) => row.status === "rejected") || rows.some((row) => row.status === "rejected") };
  } finally { clearTimeout(timer); }
}
