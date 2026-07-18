import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "../../../packages/shared/src/index.js";
import { MemoryStore, type Org } from "./store.js";

export type ApiAuthorization = { org: Org; remaining: number | null };

export interface AccountDirectory {
  authorize(rawKey: string, path: string, method: string): Promise<ApiAuthorization | undefined>;
}

export class ApiQuotaExceededError extends Error {
  constructor() { super("Monthly API quota exceeded"); }
}

export class MemoryAccountDirectory implements AccountDirectory {
  constructor(private readonly store: MemoryStore) {}
  async authorize(rawKey: string) {
    const org = this.store.orgForKey(rawKey);
    return org ? { org, remaining: null } : undefined;
  }
}

type AuthorizationRow = {
  organization_id: string;
  organization_name: string;
  organization_plan: Plan;
  monthly_send_count: number;
  monthly_resolve_count: number;
  remaining: number | null;
};

export class SupabaseAccountDirectory implements AccountDirectory {
  constructor(private readonly client: SupabaseClient) {}

  async authorize(rawKey: string, path: string, method: string) {
    if (!/^rk_(?:test|live)_[A-Za-z0-9_-]{20,}$/.test(rawKey)) return undefined;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const { data, error } = await this.client.rpc("authorize_api_key", {
      p_key_hash: keyHash,
      p_path: path,
      p_method: method,
    });
    if (error) {
      if (error.code === "P0001" && error.message.includes("api_quota_exceeded")) throw new ApiQuotaExceededError();
      if (error.code === "P0001") return undefined;
      throw new Error(`Supabase API authorization failed: ${error.message}`);
    }
    const row = (Array.isArray(data) ? data[0] : data) as AuthorizationRow | null;
    if (!row) return undefined;
    return {
      org: {
        id: row.organization_id,
        name: row.organization_name,
        plan: row.organization_plan,
        monthlySendCount: row.monthly_send_count,
        monthlyResolveCount: row.monthly_resolve_count,
      },
      remaining: row.remaining,
    };
  }
}

export function createAccountDirectory(store: MemoryStore): AccountDirectory {
  const url = process.env.SUPABASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return new MemoryAccountDirectory(store);
  return new SupabaseAccountDirectory(createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }));
}
