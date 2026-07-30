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

  it("infers the buyer side of go-to-market and excludes competing vendors", async () => {
    const calls: string[] = [];
    const searchResults = `<li class="b_algo"><a href="https://competitor.it/">Competitor</a></li><li class="b_algo"><a href="https://export-advisor.it/">Export Advisor</a></li><li class="b_algo"><a href="https://buyer.it/">Buyer</a></li>`;
    const competitorHome = `<!doctype html><title>Outbound Pro</title><meta name="description" content="Piattaforma outbound di lead generation e sales automation per aziende B2B in Italia"><a href="/team">Team</a>`;
    const competitorTeam = `<section><p>Founder</p><p>Carlo Rossi</p><p>carlo.rossi@competitor.it</p></section>`;
    const adjacentCompetitorHome = `<!doctype html><title>Export Advisor</title><meta name="description" content="Consulenza per aziende B2B italiane in crescita"><p>Servizi per l'export</p><p>Inserimento commerciale personalizzato</p><p>Selezione buyer e agenti esteri</p><a href="/team">Team</a>`;
    const adjacentCompetitorTeam = `<section><p>Sales Director</p><p>Paolo Neri</p><p>paolo.neri@export-advisor.it</p></section>`;
    const buyerHome = `<!doctype html><title>Fabbrica Nord</title><meta name="description" content="Azienda B2B manifatturiera italiana in crescita, con espansione commerciale ed export in nuovi mercati"><a href="/team">Team</a>`;
    const buyerTeam = `<section><p>Sales Director</p><p>Giulia Bianchi</p><p>giulia.bianchi@buyer.it</p></section>`;
    const buyerFetcher = (async (input: string | URL | Request) => {
      const url = String(input); calls.push(decodeURIComponent(url));
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(searchResults);
      if (url.includes("competitor.it/team")) return new Response(competitorTeam);
      if (url.includes("competitor.it")) return new Response(competitorHome);
      if (url.includes("export-advisor.it/team")) return new Response(adjacentCompetitorTeam);
      if (url.includes("export-advisor.it")) return new Response(adjacentCompetitorHome);
      if (url.includes("buyer.it/team")) return new Response(buyerTeam);
      if (url.includes("buyer.it")) return new Response(buyerHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", territory: "Italia", limit: 3 }, buyerFetcher);

    expect(result.query).toBe("aziende B2B in crescita che sviluppano vendite o nuovi mercati · Italia");
    expect(result.strategy.buyerProfile).toMatchObject({ source: "inferred", target: expect.stringContaining("aziende B2B in crescita"), decisionMakers: expect.stringContaining("commerciali") });
    expect(result.strategy.competitorPolicy).toBe("exclude_competing_vendors");
    expect(result.prospects).toEqual([expect.objectContaining({ firstName: "Giulia", domain: "buyer.it" })]);
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ domain: "competitor.it" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ domain: "export-advisor.it" })]));
    expect(calls.some((url) => url.includes("nuovi mercati") || url.includes("espansione commerciale"))).toBe(true);
    expect(calls.some((url) => url.includes("azienda manifatturiera") && url.includes("-consulenza"))).toBe(true);
    expect(calls.some((url) => url.includes("site:.it/chi-siamo") && url.includes("Business Development Manager"))).toBe(true);
    expect(calls.some((url) => url.includes("software B2B SaaS"))).toBe(false);
  });

  it("lets an explicit buyer definition override the competitor category filter", async () => {
    const agencyHome = `<!doctype html><title>Lead Partners</title><meta name="description" content="Agenzia di lead generation e appointment setting per aziende in Italia"><a href="/team">Team</a>`;
    const agencyTeam = `<section><p>Founder</p><p>Elena Verdi</p><p>elena.verdi@agency.it</p></section>`;
    const agencyFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(`<li class="b_algo"><a href="https://agency.it/">Lead Partners</a></li>`);
      if (url.includes("agency.it/team")) return new Response(agencyTeam);
      if (url.includes("agency.it")) return new Response(agencyHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "agenzie di lead generation", territory: "Italia", limit: 3 }, agencyFetcher);

    expect(result.strategy.buyerProfile.source).toBe("provided");
    expect(result.strategy.competitorPolicy).toBe("buyer_override");
    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Elena", domain: "agency.it" })]));
  });

  it("rejects sales training and coaching providers as adjacent competitors", async () => {
    const searchResults = `<li class="b_algo"><a href="https://sales-academy.it/">Sales Academy</a></li><li class="b_algo"><a href="https://buyer.it/">Buyer</a></li>`;
    const trainingHome = `<!doctype html><title>Sales Academy</title><meta name="description" content="Professional sales training, sales coaching and enablement services for B2B companies in Italy"><p>We offer personalized sales performance solutions.</p><a href="/team">Team</a>`;
    const trainingTeam = `<section><p>Sales Manager</p><p>Robert Manenica</p><p>robert.manenica@sales-academy.it</p></section>`;
    const buyerHome = `<!doctype html><title>Fabbrica Italia</title><meta name="description" content="Azienda B2B manifatturiera italiana in crescita con un team commerciale"><a href="/team">Team</a>`;
    const buyerTeam = `<section><p>Sales Director</p><p>Giulia Bianchi</p><p>giulia.bianchi@buyer.it</p></section>`;
    const trainingFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(searchResults);
      if (url.includes("sales-academy.it/team")) return new Response(trainingTeam);
      if (url.includes("sales-academy.it")) return new Response(trainingHome);
      if (url.includes("buyer.it/team")) return new Response(buyerTeam);
      if (url.includes("buyer.it")) return new Response(buyerHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", territory: "Italia", limit: 3 }, trainingFetcher);

    expect(result.prospects).toEqual([expect.objectContaining({ firstName: "Giulia", domain: "buyer.it" })]);
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ domain: "sales-academy.it" })]));
  });

  it("requires operational locality evidence instead of a bare country mention", async () => {
    const searchResults = `<li class="b_algo"><a href="https://global-sales.net/">Global Sales</a></li><li class="b_algo"><a href="https://croatia-sales.hr/">Croatia Sales</a></li><li class="b_algo"><a href="https://italy-buyer.com/">Italy Buyer</a></li>`;
    const globalHome = `<!doctype html><title>Global Sales</title><meta name="description" content="B2B software company serving clients worldwide"><p>Country selector: Italy, France, Croatia.</p><a href="/team">Team</a>`;
    const croatiaHome = `<!doctype html><title>Croatia Sales</title><meta name="description" content="B2B software company headquartered in Zagreb"><p>Markets: Italy, France and Croatia.</p><a href="/team">Team</a>`;
    const italyHome = `<!doctype html><title>Italy Buyer</title><meta name="description" content="B2B software company based in Milan with a growing commercial team"><p>Office: +39 02 1234567</p><a href="/team">Team</a>`;
    const genericTeam = `<section><p>Sales Director</p><p>Marco Bianchi</p><p>marco.bianchi@example.test</p></section>`;
    const territoryFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(searchResults);
      if (url.includes("/team")) return new Response(genericTeam.replace("example.test", new URL(url).hostname));
      if (url.includes("global-sales.net")) return new Response(globalHome);
      if (url.includes("croatia-sales.hr")) return new Response(croatiaHome);
      if (url.includes("italy-buyer.com")) return new Response(italyHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende software B2B", territory: "Italia", limit: 3 }, territoryFetcher);

    expect(result.prospects).toEqual([expect.objectContaining({ domain: "italy-buyer.com" })]);
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ domain: "global-sales.net" }), expect.objectContaining({ domain: "croatia-sales.hr" })]));
  });

  it("rejects navigation or format labels that look like people", async () => {
    const recruitingHome = `<!doctype html><title>Recruiting Italia</title><meta name="description" content="Azienda B2B di recruiting con sede in Italia"><a href="/team">Team</a><section><p>Sales Talk</p><p>Sales recruitment specialists</p></section><section><p>Nicola Montanari</p><p>CEO di un'azienda cliente</p></section><section><p>Consulenza HR</p><p>Area Sales</p></section>`;
    const recruitingTeam = `<section><p>Founder</p><p>Elena Verdi</p><p>elena.verdi@recruiting.it</p></section>`;
    const recruitingFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(`<li class="b_algo"><a href="https://recruiting.it/">Recruiting Italia</a></li>`);
      if (url.includes("recruiting.it/team")) return new Response(recruitingTeam);
      if (url.includes("recruiting.it")) return new Response(recruitingHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali in aziende recruiting B2B", territory: "Italia", limit: 3 }, recruitingFetcher);

    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Elena", domain: "recruiting.it" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Sales", lastName: "Talk" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Nicola", lastName: "Montanari" })]));
    expect(result.prospects).not.toEqual(expect.arrayContaining([expect.objectContaining({ firstName: "Consulenza", lastName: "HR" })]));
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

  it("rejects a commercial department title formatted like a person", async () => {
    const departmentHome = `<!doctype html><title>GSG Ceramic Design</title><meta name="description" content="Azienda B2B manifatturiera italiana con crescita commerciale"><a href="/azienda/">Azienda</a>`;
    const departmentPage = `<section><p>General Manager</p><p>Direttore Commerciale Italia</p><p>direttore.commercialeitalia@ceramicagsg.it</p></section>`;
    const departmentFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search") || url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response(`<li class="b_algo"><a href="https://ceramicagsg.it/azienda/">GSG Ceramic Design</a></li>`);
      if (url.includes("ceramicagsg.it/azienda")) return new Response(departmentPage);
      if (url.includes("ceramicagsg.it")) return new Response(departmentHome);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", territory: "Italia", limit: 3 }, departmentFetcher);

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

  it("keeps searching for distinct companies when an early company exposes several contacts", async () => {
    const emptyCompanies = Array.from({ length: 7 }, (_, index) => `<li class="b_algo"><a href="https://empty-${index + 1}.it/">Empty ${index + 1}</a></li>`).join("");
    const searchResults = `<li class="b_algo"><a href="https://alpha.it/">Alpha</a></li>${emptyCompanies}<li class="b_algo"><a href="https://beta.it/">Beta</a></li><li class="b_algo"><a href="https://gamma.it/">Gamma</a></li>`;
    const companyHome = (name: string) => `<!doctype html><title>${name}</title><meta name="description" content="Piattaforma software B2B con sede in Italia"><a href="/team">Team</a>`;
    const diversityFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(searchResults);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url === "https://alpha.it/team") return new Response(`<section><p>Sales Director</p><p>Ada Alpha</p><p>ada.alpha@alpha.it</p></section><section><p>Business Development Manager</p><p>Anna Alpha</p><p>anna.alpha@alpha.it</p></section><section><p>CEO</p><p>Aldo Alpha</p><p>aldo.alpha@alpha.it</p></section>`);
      if (url === "https://beta.it/team") return new Response(`<section><p>Sales Director</p><p>Bruno Beta</p><p>bruno.beta@beta.it</p></section>`);
      if (url === "https://gamma.it/team") return new Response(`<section><p>Founder</p><p>Giulia Gamma</p><p>giulia.gamma@gamma.it</p></section>`);
      if (url.startsWith("https://alpha.it")) return new Response(companyHome("Alpha"));
      if (url.startsWith("https://beta.it")) return new Response(companyHome("Beta"));
      if (url.startsWith("https://gamma.it")) return new Response(companyHome("Gamma"));
      if (/https:\/\/empty-\d+\.it/.test(url)) return new Response(companyHome("Empty"));
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali software B2B", territory: "Italia", limit: 3 }, diversityFetcher);

    expect(result.prospects).toHaveLength(3);
    expect(result.prospects.map((prospect) => prospect.domain)).toEqual(["alpha.it", "beta.it", "gamma.it"]);
    expect(new Set(result.prospects.map((prospect) => prospect.domain)).size).toBe(3);
    expect(result.sourcesScanned).toBe(10);
  });

  it("returns one primary decision-maker instead of padding results with the same company", async () => {
    const oneCompanyFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(`<li class="b_algo"><a href="https://alpha.it/">Alpha</a></li>`);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url === "https://alpha.it/team") return new Response(`<section><p>Sales Director</p><p>Ada Alpha</p><p>ada.alpha@alpha.it</p></section><section><p>Business Development Manager</p><p>Anna Alpha</p><p>anna.alpha@alpha.it</p></section><section><p>CEO</p><p>Aldo Alpha</p><p>aldo.alpha@alpha.it</p></section>`);
      if (url.startsWith("https://alpha.it")) return new Response(`<!doctype html><title>Alpha</title><meta name="description" content="Piattaforma software B2B con sede in Italia"><a href="/team">Team</a>`);
      return new Response("");
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali software B2B", territory: "Italia", limit: 3 }, oneCompanyFetcher);

    expect(result.prospects).toEqual([expect.objectContaining({ firstName: "Ada", domain: "alpha.it" })]);
  });

  it("crawls a second identity-page level to find a decision maker hidden below the company page", async () => {
    const deepFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(`<li class="b_algo"><a href="https://deep-buyer.it/">Deep Buyer</a></li>`);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url === "https://deep-buyer.it") return new Response(`<!doctype html><title>Deep Buyer</title><meta name="description" content="Azienda software B2B con sede a Milano, Italia"><a href="/azienda">Azienda</a>`);
      if (url === "https://deep-buyer.it/azienda") return new Response(`<a href="/azienda/leadership/commerciale">Direzione commerciale</a>`);
      if (url === "https://deep-buyer.it/azienda/leadership/commerciale") return new Response(`<section><p>Direttore Commerciale</p><p>Laura Bianchi</p><p>laura.bianchi [at] deep-buyer [dot] it</p></section>`);
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali software B2B", territory: "Italia", limit: 3 }, deepFetcher);

    expect(result.prospects[0]).toMatchObject({ firstName: "Laura", lastName: "Bianchi", email: "laura.bianchi@deep-buyer.it", verification: "valid", sourceUrl: "https://deep-buyer.it/azienda/leadership/commerciale" });
  });

  it("uses sitemap indexes as an official-site contact discovery surface", async () => {
    const sitemapFetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://replo.test") return new Response(product);
      if (url.includes("bing.com/search")) return new Response(`<li class="b_algo"><a href="https://sitemap-buyer.it/">Sitemap Buyer</a></li>`);
      if (url.includes("duckduckgo.com/html") || url.includes("search.yahoo.com")) return new Response("");
      if (url === "https://sitemap-buyer.it") return new Response(`<!doctype html><title>Sitemap Buyer</title><meta name="description" content="Azienda software B2B con sede a Roma, Italia">`);
      if (url === "https://sitemap-buyer.it/sitemap.xml") return new Response(`<sitemapindex><sitemap><loc>https://sitemap-buyer.it/page-sitemap.xml</loc></sitemap></sitemapindex>`);
      if (url === "https://sitemap-buyer.it/page-sitemap.xml") return new Response(`<urlset><url><loc>https://sitemap-buyer.it/company/management</loc></url></urlset>`);
      if (url === "https://sitemap-buyer.it/company/management") return new Response(`<script type="application/ld+json">{"@type":"Person","name":"Marco Verdi","jobTitle":"Sales Director"}</script><p>marco.verdi@sitemap-buyer.it</p>`);
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const result = await discoverPublicProspects({ url: "https://replo.test", audience: "responsabili commerciali software B2B", territory: "Italia", limit: 3 }, sitemapFetcher);

    expect(result.prospects[0]).toMatchObject({ firstName: "Marco", lastName: "Verdi", email: "marco.verdi@sitemap-buyer.it", verification: "valid", sourceUrl: "https://sitemap-buyer.it/company/management" });
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
