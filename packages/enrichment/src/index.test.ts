import { describe, expect, it } from "vitest";
import { extractEmails, generateCandidates } from "./index.js";
describe("owned resolution", () => {
  it("generates deterministic company patterns", () => expect(generateCandidates({ firstName: "Ada", lastName: "Lovelace", domain: "example.com" })[0].email).toBe("ada.lovelace@example.com"));
  it("extracts page-owned addresses", () => expect(extractEmails("Contact Ada@Example.com", "example.com")[0].source).toBe("page"));
});
