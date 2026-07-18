import type Stripe from "stripe";
import { getStripe, isPaidSubscriptionStatus } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature"), secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: "Firma webhook mancante" }, { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: "Firma webhook non valida" }, { status: 400 }); }
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from("webhook_events").select("id").eq("provider", "stripe").eq("external_id", event.id).maybeSingle();
  if (existing) return Response.json({ received: true, duplicate: true });
  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription, organizationId = subscription.metadata.organizationId;
    if (organizationId) {
      const paid = isPaidSubscriptionStatus(subscription.status);
      await admin.from("organizations").update({ plan: paid ? "pro" : "free", stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id }).eq("id", organizationId);
      await admin.from("subscriptions").upsert({ organization_id: organizationId, provider_id: subscription.id, status: subscription.status, current_period_end: new Date(subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : Date.now()).toISOString() }, { onConflict: "provider_id" });
    }
  }
  await admin.from("webhook_events").insert({ provider: "stripe", external_id: event.id, type: event.type });
  return Response.json({ received: true });
}
