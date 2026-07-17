import { resolve4, resolveMx } from "node:dns/promises";

export type PersonSeed = { firstName: string; lastName: string; domain: string; knownEmail?: string };
export type Candidate = { email: string; confidence: number; source: "seed" | "page" | "pattern"; verification: "valid" | "risky" | "invalid" };
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
    const mx = await resolveMx(domain);
    return { hasMx: mx.length > 0, catchAll: "unknown" as const, mx: mx.sort((a, b) => a.priority - b.priority).map((x) => x.exchange) };
  } catch {
    try { await resolve4(domain); return { hasMx: false, catchAll: "unknown" as const, mx: [] }; }
    catch { return { hasMx: false, catchAll: "unknown" as const, mx: [] }; }
  }
}

export async function resolveOwned(seed: PersonSeed): Promise<Candidate | null> {
  const domain = seed.domain.replace(/^https?:\/\//, "").split("/")[0];
  const dns = await inspectDomain(domain);
  if (!dns.hasMx && !seed.knownEmail) return null;
  return generateCandidates(seed)[0] ?? null;
}
