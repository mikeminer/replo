import { describe, expect, it } from "vitest";
import { analyzeWebsite, discoverPublicProspects } from "./index.js";

const product = `<!doctype html><title>Replo | Autonomous outbound</title><meta name="description" content="Autonomous outbound for European B2B software teams"><h1>Find relevant buyers from public company signals</h1>`;
const company = `<!doctype html><title>Acme Cloud</title><meta property="og:site_name" content="Acme Cloud"><a href="/team">Team</a><a href="mailto:hello@acme.test">Contact</a>`;
const team = `<script type="application/ld+json">{"@type":"Person","name":"Ada Lovelace","jobTitle":"VP Sales"}</script><p>Email ada.lovelace@acme.test</p>`;
const search = `<li class="b_algo"><a href="https://acme.test/">Acme</a></li>`;
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
    expect(result.query).toContain("VP Sales Italy");
    expect(result.prospects).toEqual(expect.arrayContaining([expect.objectContaining({ email: "ada.lovelace@acme.test", companyName: "Acme Cloud", source: "public_page", sourceUrl: "https://acme.test/team" })]));
  });
});
