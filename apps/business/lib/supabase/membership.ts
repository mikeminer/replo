import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./admin";
import { createSupabaseServerClient } from "./server";
import type { BusinessPlan } from "../plans";

export type BusinessOrganization = { id: string; name: string; plan: BusinessPlan; stripe_customer_id: string | null; stripe_subscription_id: string | null };

export async function authenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function organizationsForUser(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: memberships, error } = await admin.from("memberships").select("organization_id, role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ids = (memberships ?? []).map((row) => row.organization_id);
  if (!ids.length) return [];
  const { data: organizations, error: orgError } = await admin.from("organizations").select("id, name, plan, stripe_customer_id, stripe_subscription_id").in("id", ids).order("created_at");
  if (orgError) throw new Error(orgError.message);
  return (organizations ?? []) as BusinessOrganization[];
}

export async function requireBusinessContext() {
  const user = await authenticatedUser();
  if (!user) redirect("/login");
  const organizations = await organizationsForUser(user.id);
  if (!organizations[0]) throw new Error("No organization was provisioned for this account");
  const selectedId = (await cookies()).get("replo_organization_id")?.value;
  const organization = organizations.find((item) => item.id === selectedId) ?? organizations[0];
  return { user, organization, organizations };
}

export async function businessContextForRoute() {
  const user = await authenticatedUser();
  if (!user) return undefined;
  const organizations = await organizationsForUser(user.id);
  if (!organizations[0]) return undefined;
  const selectedId = (await cookies()).get("replo_organization_id")?.value;
  const organization = organizations.find((item) => item.id === selectedId) ?? organizations[0];
  return { user, organization, organizations };
}
