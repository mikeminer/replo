import { generateApiKey } from "../../../lib/api-keys";
import { getSupabaseAdmin } from "../../../lib/supabase/admin";
import { businessContextForRoute } from "../../../lib/supabase/membership";

export async function POST(request: Request) {
  const context = await businessContextForRoute();
  if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (context.organization.plan !== "pro") return Response.json({ error: "API Pro è necessario per creare chiavi live" }, { status: 402 });
  const input = await request.json().catch(() => ({})) as { name?: string }, name = input.name?.trim().slice(0, 60) || "Production";
  const key = generateApiKey("live"), admin = getSupabaseAdmin();
  const { error } = await admin.from("api_keys").insert({ organization_id: context.organization.id, name, prefix: key.prefix, hash: key.hash, last_four: key.lastFour, created_by: context.user.id });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ apiKey: key.raw }, { status: 201, headers: { "cache-control": "no-store" } });
}
