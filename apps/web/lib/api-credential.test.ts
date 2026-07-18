import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptApiCredential, encryptApiCredential, maskedApiCredential } from "./api-credential";

describe("saved API credentials", () => {
  const previousSecret = process.env.API_KEY_ENCRYPTION_SECRET;
  beforeEach(() => { process.env.API_KEY_ENCRYPTION_SECRET = Buffer.alloc(32, 7).toString("base64"); });
  afterEach(() => { process.env.API_KEY_ENCRYPTION_SECRET = previousSecret; });

  it("encrypts authenticated data and decrypts it losslessly", () => {
    const rawKey = "rk_test_secret-value";
    const encrypted = encryptApiCredential(rawKey);
    expect(encrypted).not.toContain(rawKey);
    expect(decryptApiCredential(encrypted)).toBe(rawKey);
  });

  it("renders only a safe key hint", () => {
    expect(maskedApiCredential("rk_test_", "alue")).toBe("rk_test_••••••••alue");
  });
});
