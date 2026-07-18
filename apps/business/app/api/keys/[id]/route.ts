import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { businessContextForRoute } from "../../../../lib/supabase/membership";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await businessContextForRoute();
  if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params, admin = getSupabaseAdmin();
  const { data, error } = await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("organization_id", context.organization.id).is("revoked_at", null).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Chiave non trovata" }, { status: 404 });
  return Response.json({ revoked: true });
}
