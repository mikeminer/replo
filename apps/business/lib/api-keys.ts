import { createHash, randomBytes } from "node:crypto";

export function generateApiKey(mode: "test" | "live" = "live") {
  const raw = `rk_${mode}_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashApiKey(raw), prefix: `rk_${mode}_`, lastFour: raw.slice(-4) };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function maskedApiKey(prefix: string, lastFour: string) {
  return `${prefix}••••••••••••${lastFour}`;
}
