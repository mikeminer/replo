import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { businessContextForRoute } from "../../../../lib/supabase/membership";

export async function POST() {
  const context = await businessContextForRoute();
  if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 });
  const price = process.env.STRIPE_PRICE_API_PRO_MONTHLY;
  if (!price) return Response.json({ error: "Piano Stripe non configurato" }, { status: 503 });
  const stripe = getStripe(), admin = getSupabaseAdmin();
  let customerId = context.organization.stripe_customer_id;
  if (!customerId) { const customer = await stripe.customers.create({ email: context.user.email, name: context.organization.name, metadata: { organizationId: context.organization.id, supabaseUserId: context.user.id } }); customerId = customer.id; await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", context.organization.id); }
  const baseUrl = process.env.BUSINESS_BASE_URL ?? "http://localhost:3001";
  const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, line_items: [{ price, quantity: 1 }], allow_promotion_codes: true, success_url: `${baseUrl}/dashboard?checkout=success`, cancel_url: `${baseUrl}/pricing`, metadata: { organizationId: context.organization.id, supabaseUserId: context.user.id }, subscription_data: { metadata: { organizationId: context.organization.id, supabaseUserId: context.user.id } } });
  return Response.json({ url: session.url });
}
