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
    const visibleTeam = `<section><div><p>Founder-ready toolkit</p></div><div><p>Operator advantage</p></div></section><section><p>Co-Founder &amp; CEO</p><p>Professional experience</p></section><section><p>Operations Strategy</p><p>Market Strategy</p></section><section><p>UX Researcher</p><p>Lead Designer &amp; Founder</p></section><section><div><p>Head Developer</p></div><div><p>Giovanni Verdi</p></div></section><section><div><p>HR Specialist</p></div><div><p>Alba Bianchi</p></div></section><section><div><p>Sales Director</p></div><div><p>Alberto Gengaro</p></div></section>`;
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
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "UX" })]));
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

  it("builds an Italy-specific multi-channel strategy without treating context sources as contact sources", async () => {
    const calls: string[] = [];
    const strategyFetcher = (async (input: string | URL | Request) => {
      const url = String(input); calls.push(decodeURIComponent(url));
      if (url === "https://replo.test") return new Response(product);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B ecommerce", territory: "Italia", limit: 3 }, strategyFetcher);
    const channelIds = result.strategy.channels.map((channel) => channel.id);

    expect(channelIds).toEqual(expect.arrayContaining(["europages", "netcomm", "eu-startups", "ice", "codemotion", "startup-europe", "unioncamere"]));
    expect(channelIds).not.toEqual(expect.arrayContaining(["wlw", "xing", "viadeo"]));
    expect(result.strategy.contextSources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "osservatori", purpose: "market_context" }),
      expect.objectContaining({ id: "italian-tech-communities", purpose: "community_mapping" }),
    ]));
    expect(result.strategy.contactPolicy).toBe("official_company_sites_only");
    expect(calls).toEqual(expect.arrayContaining([
      expect.stringContaining("site:europages.com"),
      expect.stringContaining("site:consorzionetcomm.it/soci"),
      expect.stringContaining("site:eu-startups.com/directory"),
      expect.stringContaining("site:ice.it"),
    ]));
  });

  it("uses a curated marketplace only as a bridge to the official company website", async () => {
    const marketplaceSearch = `<div class="compTitle"><a href="https://www.europages.com/acme/profile">Acme on Europages</a></div>`;
    const marketplaceProfile = `<a href="https://sydus.test/">Visit official website</a><a href="https://facebook.com/sydus">Social</a>`;
    const smartCompany = `<!doctype html><title>Sydus</title><meta name="description" content="B2B software and SaaS cloud platform based in Italy"><a href="/team">Team</a>`;
    const visibleTeam = `<section><p>Sales Director</p><p>Alberto Gengaro</p><p>alberto.gengaro@sydus.test</p></section>`;
    const marketplaceFetcher = (async (input: string | URL | Request) => {
      const url = String(input), decoded = decodeURIComponent(url);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("search.yahoo.com") && decoded.includes("site:europages.com")) return new Response(marketplaceSearch);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url.includes("europages.com")) return new Response(marketplaceProfile);
      if (url.includes("sydus.test/team")) return new Response(visibleTeam);
      if (url.includes("sydus.test")) return new Response(smartCompany);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende software B2B", territory: "Italia", limit: 3 }, marketplaceFetcher);

    expect(result.strategy.channels.find((channel) => channel.id === "europages")).toMatchObject({ resultsFound: true });
    expect(result.sourcesScanned).toBe(1);
    expect(result.prospects[0]).toMatchObject({ firstName: "Alberto", email: "alberto.gengaro@sydus.test", sourceUrl: "https://sydus.test/team" });
    expect(result.prospects[0]?.sourceUrl).not.toContain("europages.com");
  });

  it("switches to DACH sources and accepts German territory evidence", async () => {
    const dachHome = `<!doctype html><title>Wolke GmbH</title><meta name="description" content="B2B software company based in Berlin, Germany"><a href="/team">Team</a>`;
    const dachTeam = `<section><p>Founder</p><p>Greta Muller</p><p>greta.muller@wolke.de</p></section>`;
    const dachFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(`<li class="b_algo"><a href="https://wolke.de/">Wolke</a></li>`);
      if (url.includes("wolke.de/team")) return new Response(dachTeam);
      if (url.includes("wolke.de")) return new Response(dachHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B", territory: "DACH", limit: 3 }, dachFetcher);
    const channelIds = result.strategy.channels.map((channel) => channel.id);

    expect(channelIds).toEqual(expect.arrayContaining(["europages", "wlw", "xing"]));
    expect(channelIds).not.toEqual(expect.arrayContaining(["netcomm", "ice", "viadeo"]));
    expect(result.prospects[0]).toMatchObject({ firstName: "Greta", domain: "wolke.de", verification: "valid" });
  });

  it("enforces France instead of accepting any European company", async () => {
    const searchResults = `<li class="b_algo"><a href="https://maison.fr/">Maison</a></li><li class="b_algo"><a href="https://firma.de/">Firma</a></li>`;
    const franceFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(searchResults);
      if (url.includes("maison.fr/team")) return new Response(`<p>Founder</p><p>Camille Bernard</p><p>camille.bernard@maison.fr</p>`);
      if (url.includes("maison.fr")) return new Response(`<!doctype html><title>Maison Cloud</title><meta name="description" content="Plateforme software B2B basée à Paris, France"><a href="/team">Team</a>`);
      if (url.includes("firma.de/team")) return new Response(`<p>Founder</p><p>Greta Muller</p><p>greta.muller@firma.de</p>`);
      if (url.includes("firma.de")) return new Response(`<!doctype html><title>Firma Cloud</title><meta name="description" content="B2B software company based in Berlin, Germany"><a href="/team">Team</a>`);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B", territory: "Francia", limit: 3 }, franceFetcher);

    expect(result.strategy.channels.map((channel) => channel.id)).toContain("viadeo");
    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ domain: "maison.fr", firstName: "Camille" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ domain: "firma.de" })]));
  });

  it("scans beyond the old 18-company ceiling when the user asks for more contacts", async () => {
    const companyLinks = Array.from({ length: 26 }, (_, index) => `<li class="b_algo"><a href="https://company-${index + 1}.it/">Company ${index + 1}</a></li>`).join("");
    const broadFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(companyLinks);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (/company-\d+\.it/.test(url)) return new Response(`<!doctype html><title>Software B2B Italia</title><meta name="description" content="Piattaforma software B2B con sede in Italia"><a href="/team">Team</a>`);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "software B2B", territory: "Italia", limit: 20 }, broadFetcher);

    expect(result.sourcesScanned).toBe(26);
    expect(result.sourcesScanned).toBeGreaterThan(18);
  });

  it("prioritizes a late official team result over broad company homepages", async () => {
    const broadLinks = Array.from({ length: 42 }, (_, index) => `<li class="b_algo"><a href="https://broad-${index + 1}.it/">Broad ${index + 1}</a></li>`).join("");
    const priorityFetcher = (async (input: string | URL | Request) => {
      const url = String(input), decoded = decodeURIComponent(url);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") && decoded.includes("team leadership")) return new Response(`<li class="b_algo"><a href="https://priority.it/team">Priority team</a></li>`);
      if (url.includes("bing.com/search")) return new Response(broadLinks);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url === "https://priority.it/team") return new Response(`<section><p>Sales Director</p><p>Giulia Bianchi</p><p>giulia.bianchi@priority.it</p></section>`);
      if (url.startsWith("https://priority.it")) return new Response(`<!doctype html><title>Priority SaaS</title><meta name="description" content="Software B2B con sede in Italia"><a href="/team">Team</a>`);
      if (/broad-\d+\.it/.test(url)) return new Response(`<!doctype html><title>Broad Software</title><meta name="description" content="Software B2B con sede in Italia">`);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali software B2B", territory: "Italia", limit: 20 }, priorityFetcher);

    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Giulia", domain: "priority.it" })]));
  });
});
