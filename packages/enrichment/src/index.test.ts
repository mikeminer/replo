import { describe, expect, it } from "vitest";
import { analyzeWebsite, discoverPublicProspects } from "./index.js";

const product = `<!doctype html><title>Replo | Autonomous outbound</title><meta name="description" content="Autonomous outbound for European B2B software teams"><h1>Find relevant buyers from public company signals</h1>`;
const company = `<!doctype html><title>Acme Cloud</title><meta property="og:site_name" content="Acme Cloud"><meta name="description" content="B2B cloud software for modern companies in Italy"><a href="/news">News</a><a href="/team">Team</a><a href="mailto:hello@acme.test">Contact</a>`;
const team = `<script type="application/ld+json">{"@type":"Person","name":"Ada Lovelace","jobTitle":"VP Sales"}</script><p>Email ada.lovelace@acme.test</p>`;
const search = `<nav><a href="https://irrelevant.test/">Noise</a></nav><li class="b_algo"><a href="https://acme.test/">Acme</a></li>`;
const fetcher = (async (input: string | URL | Request) => {
  const url = String(input);
  if (url.includes("bing.com/search")) return new Response(search);
  if (url.includes("acme.test/team")) return new Response(team);
  if (url.includes("acme.test")) return new Response(company);
  return new Response(product);
}) as typeof fetch;

describe("public-web discovery", () => {
  it("analyzes real page metadata instead of deriving a placeholder from the hostname", async () => {
    const analysis = await analyzeWebsite("https://replo.test", fetcher);
    expect(analysis).toMatchObject({ name: "Replo", summary: "Autonomous outbound for European B2B software teams" });
    expect(analysis.keywords).toContain("autonomous");
  });

  it("refuses private-network targets", async () => {
    await expect(analyzeWebsite("http://127.0.0.1/admin", fetcher)).rejects.toThrow("public HTTP(S)");
  });

  it("finds a traceable public contact without an uploaded mailing list", async () => {
    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "VP Sales", territory: "Italy", limit: 3 }, fetcher);
    expect(result.query).toBe("VP Sales · Italy");
    expect(result.sourcesScanned).toBe(1);
    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ email: "ada.lovelace@acme.test", companyName: "Acme Cloud", source: "public_page", sourceUrl: "https://acme.test/team" })]));
  });

  it("expands across public search surfaces when the first provider has no useful result", async () => {
    const calls: string[] = [];
    const fallbackFetcher = (async (input: string | URL | Request) => {
      const url = String(input); calls.push(url);
      if (url.includes("bing.com/search")) return new Response(`<a href="https://irrelevant.test/">Navigation noise</a>`);
      if (url.includes("duckduckgo.com/html")) return new Response(`<a class="result__a" href="https://acme.test/">Acme Cloud</a>`);
      if (url.includes("acme.test/team")) return new Response(team);
      if (url.includes("acme.test")) return new Response(company);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "aziende software B2B", territory: "Italia", limit: 3 }, fallbackFetcher);

    expect(calls.some((url) => url.includes("duckduckgo.com/html"))).toBe(true);
    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ email: "ada.lovelace@acme.test" })]));
    expect(result.query).toBe("aziende software B2B · Italia");
  });

  it("does not invent a person from a departmental public mailbox", async () => {
    const relationsCompany = `<!doctype html><title>Relations Cloud</title><meta name="description" content="B2B software platform in Italy"><p>epc.consumerrelations@relations.test</p>`;
    const relationsFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html")) return new Response(`<li class="b_algo"><a href="https://relations.test/">Relations Cloud</a></li>`);
      if (url.includes("relations.test")) return new Response(relationsCompany);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B", territory: "Europa", limit: 3 }, relationsFetcher);
    expect(result.prospects).toEqual([]);
  });

  it("extracts named decision makers from an official team card and prioritizes the requested role", async () => {
    const smartCompany = `<!doctype html><title>Sydus</title><meta name="description" content="B2B software and SaaS cloud platform in Italy"><a href="/chi-siamo">Chi siamo</a>`;
    const visibleTeam = `<section><div><p>Founder-ready toolkit</p></div><div><p>Operator advantage</p></div></section><section><p>Co-Founder &amp; CEO</p><p>Professional experience</p></section><section><p>Operations Strategy</p><p>Market Strategy</p></section><section><div><p>Head Developer</p></div><div><p>Giovanni Verdi</p></div></section><section><div><p>HR Specialist</p></div><div><p>Alba Bianchi</p></div></section><section><div><p>Sales Director</p></div><div><p>Alberto Gengaro</p></div></section>`;
    const smartFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html")) return new Response(`<a class="result__a" href="https://sydus.test/chi-siamo">Sydus</a>`);
      if (url.includes("sydus.test/chi-siamo")) return new Response(visibleTeam);
      if (url.includes("sydus.test")) return new Response(smartCompany);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende software B2B", territory: "Italia", limit: 3 }, smartFetcher);

    expect(result.prospects[0]).toMatchObject({ firstName: "Alberto", lastName: "Gengaro", role: "Sales Director", email: "alberto.gengaro@sydus.test", confidence: 0.68, verification: "risky", sourceUrl: "https://sydus.test/chi-siamo" });
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Operator" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Professional" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Market" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Alba" })]));
  });

  it("uses public editorial results only to reach the official company website", async () => {
    const yahooResult = `<div class="compTitle"><a href="https://r.search.yahoo.com/path/RU=https%3A%2F%2Fcatalogo.test%2Fmigliori-software%2F/RK=2/RS=x">Catalogo</a></div>`;
    const catalog = `<article><a href="https://sydus.test/">Visita il sito ufficiale di Sydus</a></article>`;
    const smartCompany = `<!doctype html><title>Sydus</title><meta name="description" content="B2B software and SaaS cloud platform in Italy"><a href="/chi-siamo">Chi siamo</a>`;
    const visibleTeam = `<div><img alt="Alberto Gengaro"><p>Alberto Gengaro</p><p>Sales Director</p></div>`;
    const expansionFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("search.yahoo.com")) return new Response(yahooResult);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html")) return new Response("");
      if (url.includes("catalogo.test")) return new Response(catalog);
      if (url.includes("sydus.test/chi-siamo")) return new Response(visibleTeam);
      if (url.includes("sydus.test")) return new Response(smartCompany);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende software B2B", territory: "Italia", limit: 3 }, expansionFetcher);

    expect(result.sourcesScanned).toBe(1);
    expect(result.prospects[0]).toMatchObject({ firstName: "Alberto", companyName: "Sydus", sourceUrl: "https://sydus.test/chi-siamo" });
    expect(result.prospects[0]?.sourceUrl).not.toContain("catalogo.test");
  });

  it("matches an abbreviated published email to the full person name", async () => {
    const officialHome = `<!doctype html><title>Soft Tech | Piattaforma</title><meta property="og:site_name" content="BrainPress"><meta name="description" content="B2B software and SaaS cloud platform in Italy"><a href="/team">Team</a>`;
    const officialTeam = `<section><h3>Pellegrino Testa</h3><p>Chief Information Officer</p><p>p.testa@soft.test</p></section>`;
    const officialFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(`<li class="b_algo"><a href="https://soft.test/team">Soft Tech</a></li>`);
      if (url.includes("soft.test/team")) return new Response(officialTeam);
      if (url.includes("soft.test")) return new Response(officialHome);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B", territory: "Italia", limit: 3 }, officialFetcher);

    expect(result.prospects[0]).toMatchObject({ firstName: "Pellegrino", lastName: "Testa", companyName: "Soft Tech", email: "p.testa@soft.test", verification: "valid", source: "public_page" });
  });

  it("keeps automatic expansion inside the requested territory", async () => {
    const outsideHome = `<!doctype html><title>Outside Cloud</title><meta name="description" content="B2B software company based in New York"><a href="/team">Team</a>`;
    const outsideTeam = `<section><p>Sales Director</p><p>Jordan Smith</p></section>`;
    const outsideFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(`<li class="b_algo"><a href="https://outside.test/team">Outside Cloud</a></li>`);
      if (url.includes("outside.test/team")) return new Response(outsideTeam);
      if (url.includes("outside.test")) return new Response(outsideHome);
      return new Response(product);
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende software B2B", territory: "Italia", limit: 3 }, outsideFetcher);

    expect(result.prospects).toEqual([]);
  });
});
