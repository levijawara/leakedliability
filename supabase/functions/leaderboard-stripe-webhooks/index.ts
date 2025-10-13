import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const log = (msg: string, extra?: unknown) =>
  console.log(`[LEADERBOARD-WEBHOOKS] ${msg}`, extra ?? "");

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2022-11-15",
    });

    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });

    const whsec = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!whsec) return new Response("Missing webhook secret", { status: 500 });

    // Raw body + ASYNC verification is mandatory in Deno
    const raw = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(raw, sig, whsec);
      log("verified", { id: event.id, type: event.type });
    } catch (e) {
      log("bad signature", String(e));
      return new Response("Bad signature", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (!userId || !customerId) {
          log("missing userId or customerId", { userId, customerId });
          break;
        }

        const { error } = await supabase
          .from("user_entitlements")
          .upsert(
            {
              user_id: userId,
              entitlement_type: "leaderboard",
              source: "stripe_subscription",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,entitlement_type" }
          );

        if (error) log("upsert error", error);
        else log("entitlement upserted", { userId, customerId, subscriptionId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const status = sub.status === "active" ? "active" : "inactive";
        const endIso = new Date(sub.current_period_end * 1000).toISOString();

        const { error } = await supabase
          .from("user_entitlements")
          .update({
            status,
            subscription_end: endIso,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard");

        if (error) log("update error", error);
        else log("subscription updated", { customerId, status, endIso });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { error } = await supabase
          .from("user_entitlements")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard")
          .eq("source", "stripe_subscription");

        if (error) log("cancel error", error);
        else log("subscription cancelled", { customerId });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string;

        const { error } = await supabase
          .from("user_entitlements")
          .update({
            status: "inactive",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard");

        if (error) log("payment_failed update error", error);
        else log("entitlement set inactive", { customerId });
        break;
      }

      default:
        log("unhandled", { type: event.type });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    log("fatal", String(e));
    return new Response(JSON.stringify({ error: "webhook_error" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
