import { encryptApiCredential } from "../../../../lib/api-credential";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

type MeResponse = { organization?: { name?: string; plan?: string } };

async function authenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Devi accedere prima di salvare una chiave." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { apiKey?: string };
  const apiKey = body.apiKey?.trim();
  if (!apiKey || !apiKey.startsWith("rk_") || apiKey.length < 20) return Response.json({ error: "Formato della chiave non valido." }, { status: 400 });

  const verification = await fetch(new URL("/v1/me", process.env.API_BASE_URL ?? "https://api.replo.eu"), {
    headers: { authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
  if (!verification?.ok) return Response.json({ error: "La chiave non è valida, è revocata o ha esaurito la quota." }, { status: 400 });
  const verified = await verification.json() as MeResponse;
  const organization = verified.organization;
  if (!organization?.name || !organization.plan) return Response.json({ error: "Risposta API non riconosciuta." }, { status: 502 });

  const { error } = await getSupabaseAdmin().from("user_api_credentials").upsert({
    user_id: user.id,
    encrypted_api_key: encryptApiCredential(apiKey),
    key_prefix: apiKey.slice(0, Math.min(8, apiKey.length - 4)),
    last_four: apiKey.slice(-4),
    organization_name: organization.name,
    organization_plan: organization.plan,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return Response.json({ error: "Salvataggio non riuscito." }, { status: 500 });
  return Response.json({ saved: true, organization });
}

export async function DELETE() {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Non autorizzato." }, { status: 401 });
  const { error } = await getSupabaseAdmin().from("user_api_credentials").delete().eq("user_id", user.id);
  if (error) return Response.json({ error: "Rimozione non riuscita." }, { status: 500 });
  return Response.json({ removed: true });
}
