import { getStripe } from "../../../../lib/stripe";
import { businessContextForRoute } from "../../../../lib/supabase/membership";

export async function POST() { const context = await businessContextForRoute(); if (!context) return Response.json({ error: "Non autorizzato" }, { status: 401 }); if (!context.organization.stripe_customer_id) return Response.json({ error: "Cliente Stripe non trovato" }, { status: 404 }); const session = await getStripe().billingPortal.sessions.create({ customer: context.organization.stripe_customer_id, return_url: `${process.env.BUSINESS_BASE_URL ?? "http://localhost:3001"}/dashboard` }); return Response.json({ url: session.url }); }
