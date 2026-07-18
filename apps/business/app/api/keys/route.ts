import { generateApiKey } from "../../../lib/api-keys";
import { getSupabaseAdmin } from "../../../lib/supabase/admin";
import { businessContextForRoute } from "../../../lib/supabase/membership";
import { PLAN_DETAILS } from "../../../lib/plans";

export async function POST(request: Request) {
  const context = await businessContextForRoute();
  if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  const details = PLAN_DETAILS[context.organization.plan];
  if (context.organization.plan === "free") return Response.json({ error: "È necessario un piano Startup, Partner o Enterprise" }, { status: 402 });
  const admin = getSupabaseAdmin();
  if (details.maxActiveKeys !== null) {
    const { count } = await admin.from("api_keys").select("id", { count: "exact", head: true }).eq("organization_id", context.organization.id).is("revoked_at", null);
    if ((count ?? 0) >= details.maxActiveKeys) return Response.json({ error: `Il piano ${details.label} consente una sola chiave API attiva` }, { status: 409 });
  }
  const input = await request.json().catch(() => ({})) as { name?: string };
  const requestedName = input.name?.trim().slice(0, 60);
  if (details.customKeyLabels && !requestedName) return Response.json({ error: "Inserisci un'etichetta per la chiave API" }, { status: 422 });
  const name = details.customKeyLabels ? requestedName! : "Production";
  const key = generateApiKey("live");
  const { error } = await admin.from("api_keys").insert({ organization_id: context.organization.id, name, prefix: key.prefix, hash: key.hash, last_four: key.lastFour, created_by: context.user.id });
  if (error?.message.includes("api_key_limit_reached")) return Response.json({ error: `Il piano ${details.label} ha raggiunto il limite di chiavi attive` }, { status: 409 });
  if (error) return Response.json({ error: "Impossibile generare la chiave API" }, { status: 500 });
  return Response.json({ apiKey: key.raw }, { status: 201, headers: { "cache-control": "no-store" } });
}
