import { getStripe, stripePriceForPlan } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { businessContextForRoute } from "../../../../lib/supabase/membership";
import { isPaidBusinessPlan } from "../../../../lib/plans";

export async function POST(request: Request) {
  const context = await businessContextForRoute();
  if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  if (context.organization.plan !== "free") return Response.json({ error: "Gestisci il piano attivo dal portale di fatturazione" }, { status: 409 });
  const input = await request.json().catch(() => ({})) as { plan?: string };
  if (!input.plan || !isPaidBusinessPlan(input.plan)) return Response.json({ error: "Piano non valido" }, { status: 400 });
  const plan = input.plan, price = stripePriceForPlan(plan);
  if (!price) return Response.json({ error: "Piano Stripe non configurato" }, { status: 503 });
  const stripe = getStripe(), admin = getSupabaseAdmin();
  let customerId = context.organization.stripe_customer_id;
  if (!customerId) { const customer = await stripe.customers.create({ email: context.user.email, name: context.organization.name, metadata: { organizationId: context.organization.id, supabaseUserId: context.user.id } }); customerId = customer.id; await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", context.organization.id); }
  const baseUrl = process.env.BUSINESS_BASE_URL ?? "http://localhost:3001";
  const metadata = { organizationId: context.organization.id, supabaseUserId: context.user.id, plan };
  const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, line_items: [{ price, quantity: 1 }], allow_promotion_codes: true, success_url: `${baseUrl}/dashboard?checkout=success`, cancel_url: `${baseUrl}/pricing`, metadata, subscription_data: { metadata } });
  return Response.json({ url: session.url });
}
