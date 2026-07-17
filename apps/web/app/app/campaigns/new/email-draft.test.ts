import { describe, expect, it } from "vitest";
import { buildEmailDraft } from "./email-draft";

describe("buildEmailDraft", () => {
  it("creates a complete copy-ready email with recipient and sender names", () => {
    const draft = buildEmailDraft(
      {
        firstName: "Giulia",
        lastName: "Bianchi",
        domain: "acme.it",
        email: "giulia@acme.it",
        companyName: "Acme",
        role: "Head of Sales",
        confidence: 0.98,
        verification: "valid",
        source: "public_page",
        sourceUrl: "https://acme.it/team",
        evidence: "Public team page",
      },
      {
        url: "https://replo.it",
        name: "Replo",
        title: "Prospect research",
        summary: "Trova prospect rilevanti dal sito del prodotto.",
        keywords: ["prospect"],
      },
      "Michele Rossi",
      "Founder · Replo",
      "team commerciali B2B",
    );

    expect(draft.to).toBe("giulia@acme.it");
    expect(draft.subject).toContain("Acme");
    expect(draft.body).toContain("Ciao Giulia,");
    expect(draft.body).toContain("Michele Rossi\nFounder · Replo");
    expect(draft.complete).toContain("Nome: Giulia Bianchi");
    expect(draft.complete).toContain("Oggetto:");
  });
});
