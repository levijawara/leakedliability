import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LEADERBOARD-WEBHOOKS] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event verified", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          logStep("ERROR: No user_id in metadata");
          break;
        }

        logStep("Checkout completed", { userId, customerId, subscriptionId });

        // Create or update entitlement
        await supabaseClient
          .from('user_entitlements')
          .upsert({
            user_id: userId,
            entitlement_type: 'leaderboard',
            source: 'stripe_subscription',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
          }, {
            onConflict: 'user_id,entitlement_type'
          });

        logStep("Entitlement created/updated");
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: entitlement } = await supabaseClient
          .from('user_entitlements')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .eq('entitlement_type', 'leaderboard')
          .maybeSingle();

        if (!entitlement) {
          logStep("No entitlement found for customer", { customerId });
          break;
        }

        const status = subscription.status === 'active' ? 'active' : 'inactive';
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        await supabaseClient
          .from('user_entitlements')
          .update({
            status,
            subscription_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .eq('entitlement_type', 'leaderboard');

        logStep("Subscription updated", { status, subscriptionEnd });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseClient
          .from('user_entitlements')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .eq('entitlement_type', 'leaderboard')
          .eq('source', 'stripe_subscription');

        logStep("Subscription cancelled", { customerId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseClient
          .from('user_entitlements')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .eq('entitlement_type', 'leaderboard');

        logStep("Payment failed - entitlement deactivated", { customerId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});