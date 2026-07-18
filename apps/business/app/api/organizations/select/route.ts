import { cookies } from "next/headers";
import { authenticatedUser, organizationsForUser } from "../../../../lib/supabase/membership";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  const form = await request.formData(), organizationId = String(form.get("organizationId") ?? "");
  const organizations = await organizationsForUser(user.id);
  if (!organizations.some((item) => item.id === organizationId)) return Response.json({ error: "Workspace non valido" }, { status: 403 });
  (await cookies()).set("replo_organization_id", organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return Response.redirect(new URL("/dashboard", request.url), 303);
}
