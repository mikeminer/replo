import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!encoded) throw new Error("API key encryption is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("API_KEY_ENCRYPTION_SECRET must be 32 bytes in base64");
  return key;
}

export function encryptApiCredential(rawKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(rawKey, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptApiCredential(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored API key is malformed");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function maskedApiCredential(prefix: string, lastFour: string) {
  return `${prefix}••••••••${lastFour}`;
}
