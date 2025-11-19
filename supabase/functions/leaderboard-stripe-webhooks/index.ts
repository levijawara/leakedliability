import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const log = (msg: string, extra?: unknown) =>
  console.log(`[LEADERBOARD-WEBHOOKS] ${msg}`, extra ?? "");

// Helper: Calculate business days (skip weekends)
const calculateBusinessDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

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
        
        // Check if this is an escrow payment
        if (session.metadata?.type === "escrow_payment") {
          const escrowId = session.metadata.escrow_payment_id;
          const paymentReportId = session.metadata.payment_report_id;
          const paymentIntentId = session.payment_intent as string;

          log("escrow payment detected", { escrowId, paymentReportId });

          // Update escrow payment to "paid"
          const { error: escrowError } = await supabase
            .from("escrow_payments")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", escrowId);

          if (escrowError) {
            log("escrow update error", escrowError);
            break;
          }

          // Update payment report to "paid"
          const { error: reportError } = await supabase
            .from("payment_reports")
            .update({
              status: "paid",
              payment_date: new Date().toISOString(),
            })
            .eq("id", paymentReportId);

          if (reportError) {
            log("payment report update error", reportError);
            break;
          }

          // Delete any queued notifications for this report
          await supabase
            .from("queued_producer_notifications")
            .delete()
            .eq("payment_report_id", paymentReportId);

          log("escrow payment processed successfully", { escrowId, paymentReportId });
          break;
        }
        
        // Existing subscription checkout logic
        const userId = session.metadata?.user_id;
        const producerId = session.metadata?.producer_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (!userId || !customerId) {
          log("missing userId or customerId", { userId, customerId });
          break;
        }

        // Extract tier and billing frequency from session metadata
        const subscriptionTier = session.metadata?.subscription_tier || 'crew_t1';
        const billingFrequency = session.metadata?.billing_frequency || 'monthly';

        // Grant leaderboard entitlement with tier info
        const { error } = await supabase
          .from("user_entitlements")
          .upsert(
            {
              user_id: userId,
              entitlement_type: "leaderboard",
              source: "stripe_subscription",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
              subscription_tier: subscriptionTier,
              billing_frequency: billingFrequency,
              status: "active",
              failed_attempts: 0,
              payment_failed_at: null,
              grace_period_ends_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,entitlement_type" }
          );

        if (error) log("upsert error", error);
        else log("entitlement upserted", { userId, customerId, subscriptionId });

        // If this is a producer subscription, track it and add to pool
        if (producerId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId as string);
          const priceId = sub.items.data[0]?.price.id;
          const amount = (sub.items.data[0]?.price.unit_amount || 0) / 100;
          const contribution = amount * 0.30;

          let tier = "tier_1";
          if (priceId === Deno.env.get("STRIPE_TIER_2_PRICE_ID")) tier = "tier_2";
          if (priceId === Deno.env.get("STRIPE_TIER_3_PRICE_ID")) tier = "tier_3";

          const { error: subError } = await supabase
            .from("producer_subscriptions")
            .insert({
              producer_id: producerId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId as string,
              tier,
              status: "active",
              monthly_amount: amount,
              contribution_to_pool: contribution,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            });

          if (subError) log("producer subscription error", subError);
          else {
            // Add contribution to pool
            const { error: poolError } = await supabase.rpc("add_to_confirmation_pool", {
              amount: contribution,
            });
            if (poolError) log("pool update error", poolError);
            else log("added to pool", { contribution });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const status = sub.status === "active" ? "active" : "inactive";
        const endIso = new Date(sub.current_period_end * 1000).toISOString();

        // Update entitlement
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

        // Update producer subscription if exists
        const { error: prodError } = await supabase
          .from("producer_subscriptions")
          .update({
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (prodError) log("producer subscription update error", prodError);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Send cancellation email
        const { data: entitlement } = await supabase
          .from("user_entitlements")
          .select("user_id, subscription_tier, profiles!inner(email, legal_first_name, legal_last_name)")
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard")
          .single();

        if (entitlement) {
          const profile = Array.isArray(entitlement.profiles) ? entitlement.profiles[0] : entitlement.profiles;
          
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'subscription_canceled',
              to: profile.email,
              data: {
                userName: `${profile.legal_first_name} ${profile.legal_last_name}`,
                subscriptionTier: entitlement.subscription_tier,
                resubscribeUrl: `${Deno.env.get("SUPABASE_URL")}/subscribe`,
                reason: 'manual_cancellation',
              }
            }
          });
        }

        // Update entitlement
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

        // Cancel producer subscription if exists
        const { error: prodError } = await supabase
          .from("producer_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (prodError) log("producer subscription cancel error", prodError);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get current entitlement
        const { data: entitlement } = await supabase
          .from("user_entitlements")
          .select("user_id, failed_attempts, profiles!inner(email, legal_first_name, legal_last_name)")
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard")
          .single();

        if (entitlement) {
          const newFailedAttempts = (entitlement.failed_attempts || 0) + 1;
          const updateData: any = {
            failed_attempts: newFailedAttempts,
            payment_failed_at: entitlement.failed_attempts === 0 ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          };

          // If 3rd failure, start grace period
          if (newFailedAttempts >= 3) {
            const gracePeriodEnd = calculateBusinessDays(new Date(), 5);
            updateData.grace_period_ends_at = gracePeriodEnd.toISOString();
            updateData.status = 'grace_period';

            // Send payment failed email
            const profile = Array.isArray(entitlement.profiles) ? entitlement.profiles[0] : entitlement.profiles;
            
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'subscription_payment_failed',
                to: profile.email,
                data: {
                  userName: `${profile.legal_first_name} ${profile.legal_last_name}`,
                  gracePeriodEnd: gracePeriodEnd.toISOString(),
                  billingPortalUrl: `${Deno.env.get("SUPABASE_URL")}/leaderboard`,
                  failedAttempts: newFailedAttempts,
                }
              }
            });
          }

          await supabase
            .from("user_entitlements")
            .update(updateData)
            .eq("stripe_customer_id", customerId)
            .eq("entitlement_type", "leaderboard");

          log("payment failed", { customerId, failedAttempts: newFailedAttempts });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Reset failed attempts and clear grace period
        await supabase
          .from("user_entitlements")
          .update({
            failed_attempts: 0,
            payment_failed_at: null,
            grace_period_ends_at: null,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("entitlement_type", "leaderboard");

        log("payment succeeded - reset failures", { customerId });
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
