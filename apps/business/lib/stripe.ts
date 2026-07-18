import Stripe from "stripe";

let stripeClient: Stripe | undefined;
export function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  stripeClient = new Stripe(key);
  return stripeClient;
}

export function isPaidSubscriptionStatus(status: string) {
  return status === "active" || status === "trialing";
}
