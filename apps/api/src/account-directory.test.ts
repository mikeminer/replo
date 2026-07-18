import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ApiQuotaExceededError, SupabaseAccountDirectory } from "./account-directory.js";

describe("SupabaseAccountDirectory", () => {
  it("hashes API keys before authorization and returns the organization", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ organization_id: "org_1", organization_name: "Acme", organization_plan: "partner", monthly_send_count: 0, monthly_resolve_count: 0, remaining: null }], error: null });
    const directory = new SupabaseAccountDirectory({ rpc } as never);
    const raw = "rk_test_abcdefghijklmnopqrstuvwxyz";
    const result = await directory.authorize(raw, "/v1/me", "GET");
    expect(rpc).toHaveBeenCalledWith("authorize_api_key", { p_key_hash: createHash("sha256").update(raw).digest("hex"), p_path: "/v1/me", p_method: "GET" });
    expect(result).toMatchObject({ org: { id: "org_1", name: "Acme", plan: "partner" }, remaining: null });
  });

  it("rejects malformed and revoked keys without exposing a database query", async () => {
    const rpc = vi.fn();
    const directory = new SupabaseAccountDirectory({ rpc } as never);
    expect(await directory.authorize("not-a-key", "/v1/me", "GET")).toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("distinguishes an exhausted quota from an invalid key", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: "api_quota_exceeded" } });
    const directory = new SupabaseAccountDirectory({ rpc } as never);
    await expect(directory.authorize("rk_test_abcdefghijklmnopqrstuvwxyz", "/v1/me", "GET")).rejects.toBeInstanceOf(ApiQuotaExceededError);
  });
});
