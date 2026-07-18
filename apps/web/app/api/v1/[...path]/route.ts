import type { NextRequest } from "next/server";
import { decryptApiCredential } from "../../../../lib/api-credential";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: { code: "authentication_required", message: "Accedi a replo.it per usare l'API" } }, { status: 401 });
  const { data: credential } = await getSupabaseAdmin().from("user_api_credentials").select("encrypted_api_key").eq("user_id", user.id).maybeSingle();
  const apiKey = credential?.encrypted_api_key ? decryptApiCredential(credential.encrypted_api_key) : process.env.REPLO_WORKSPACE_API_KEY;
  if (!apiKey) return Response.json({ error: { code: "server_misconfigured", message: "Replo workspace API key is missing" } }, { status: 503 });
  const { path } = await context.params;
  const target = new URL(`/v1/${path.join("/")}`, process.env.API_BASE_URL ?? "https://api.replo.eu");
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.delete("host"); headers.delete("content-length");
  const response = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), cache: "no-store", signal: AbortSignal.timeout(95_000) });
  const outgoing = new Headers(response.headers); outgoing.delete("content-encoding"); outgoing.delete("content-length");
  return new Response(response.body, { status: response.status, headers: outgoing });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
