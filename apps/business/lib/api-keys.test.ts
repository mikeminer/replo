import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, maskedApiKey } from "./api-keys";

describe("API keys", () => {
  it("generates a live key and persists only a deterministic hash", () => {
    const key = generateApiKey();
    expect(key.raw).toMatch(/^rk_live_[A-Za-z0-9_-]{32}$/);
    expect(key.hash).toBe(hashApiKey(key.raw));
    expect(key.hash).not.toContain(key.raw);
    expect(maskedApiKey(key.prefix, key.lastFour)).toContain(key.lastFour);
  });
});
