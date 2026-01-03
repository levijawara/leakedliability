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

    // STRIPE GUARDRAIL: Use shared validation (throws if missing)
    const { getStripeClient } = await import("../_shared/stripeValidation.ts");
    const stripe = getStripeClient();

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
              cc: "leakedliability@gmail.com",
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
                cc: "leakedliability@gmail.com",
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

      // ============ IDENTITY VERIFICATION EVENTS ============
      case "identity.verification_session.verified": {
        const session = event.data.object as any;
        const producerId = session.metadata?.producer_id;
        const userId = session.metadata?.user_id;
        const producerName = session.metadata?.producer_name;
        const userEmail = session.metadata?.user_email;

        if (!producerId || !userId) {
          log("identity verified but missing metadata", { producerId, userId });
          break;
        }

        log("identity verification verified", { producerId, userId });

        // Get verification report for extracted name data
        let verifiedFirstName = "";
        let verifiedLastName = "";
        
        try {
          if (session.last_verification_report) {
            const report = await stripe.identity.verificationReports.retrieve(
              session.last_verification_report
            );
            verifiedFirstName = report.document?.first_name || "";
            verifiedLastName = report.document?.last_name || "";
            log("extracted name from report", { verifiedFirstName, verifiedLastName });
          }
        } catch (e) {
          log("could not retrieve verification report", String(e));
        }

        const verifiedFullName = `${verifiedFirstName} ${verifiedLastName}`.trim();

        // Get producer details
        const { data: producer, error: producerError } = await supabase
          .from("producers")
          .select("name, email")
          .eq("id", producerId)
          .single();

        if (producerError || !producer) {
          log("producer not found", { producerId });
          break;
        }

        // Business Logic Checks
        // A. Name matching (fuzzy - check if names are similar)
        const normalizedProducerName = producer.name.toLowerCase().trim();
        const normalizedVerifiedName = verifiedFullName.toLowerCase().trim();
        
        // Simple fuzzy match: check if either name contains the other or they share significant overlap
        const nameMatch = 
          normalizedProducerName.includes(normalizedVerifiedName) ||
          normalizedVerifiedName.includes(normalizedProducerName) ||
          normalizedProducerName.split(" ").some((part: string) => 
            normalizedVerifiedName.includes(part) && part.length > 2
          ) ||
          normalizedVerifiedName.split(" ").some((part: string) => 
            normalizedProducerName.includes(part) && part.length > 2
          );

        // B. Email domain matching
        const emailDomainMatch = producer.email && userEmail &&
          userEmail.split("@")[1] === producer.email.split("@")[1];

        log("verification checks", { 
          producerName: producer.name, 
          verifiedName: verifiedFullName,
          nameMatch, 
          emailDomainMatch 
        });

        if (nameMatch || emailDomainMatch) {
          // AUTO-APPROVE: Name or email domain matches
          const { error: updateError } = await supabase
            .from("producers")
            .update({
              stripe_verification_status: "verified",
              has_claimed_account: true,
              is_placeholder: false,
              claimed_by_user_id: userId,
              claimed_at: new Date().toISOString(),
            })
            .eq("id", producerId);

          if (updateError) {
            log("error updating producer", updateError);
          }

          // Log success
          await supabase.from("identity_claim_history").insert({
            producer_id: producerId,
            user_id: userId,
            old_status: "pending",
            new_status: "verified",
            stripe_session_id: session.id,
            verification_report_id: session.last_verification_report,
            matched_name: nameMatch ? verifiedFullName : null,
            matched_email_domain: emailDomainMatch ? userEmail?.split("@")[1] : null,
          });

          log("claim auto-approved", { producerId, userId });

          // TODO: Send success email to user
          // await supabase.functions.invoke('send-email', { ... });

        } else {
          // PENDING ADMIN: Mismatch detected
          const { error: updateError } = await supabase
            .from("producers")
            .update({
              stripe_verification_status: "pending_admin",
            })
            .eq("id", producerId);

          if (updateError) {
            log("error updating producer to pending_admin", updateError);
          }

          // Log for admin review
          await supabase.from("identity_claim_history").insert({
            producer_id: producerId,
            user_id: userId,
            old_status: "pending",
            new_status: "pending_admin",
            stripe_session_id: session.id,
            verification_report_id: session.last_verification_report,
            rejection_reason: `Name mismatch: verified="${verifiedFullName}" vs producer="${producer.name}"`,
          });

          log("claim sent to admin review", { producerId, reason: "name mismatch" });

          // TODO: Send admin notification email
        }
        break;
      }

      case "identity.verification_session.requires_input": {
        const session = event.data.object as any;
        const producerId = session.metadata?.producer_id;
        
        log("identity verification requires input", { producerId, sessionId: session.id });
        // Keep status as pending - user needs to retry verification
        // No database update needed
        break;
      }

      case "identity.verification_session.canceled": {
        const session = event.data.object as any;
        const producerId = session.metadata?.producer_id;
        const userId = session.metadata?.user_id;

        log("identity verification canceled", { producerId, sessionId: session.id });

        if (producerId) {
          // Clear session and reset status
          const { error: updateError } = await supabase
            .from("producers")
            .update({
              stripe_verification_session_id: null,
              stripe_verification_status: "unverified",
            })
            .eq("id", producerId)
            .eq("stripe_verification_session_id", session.id);

          if (updateError) {
            log("error resetting producer after cancellation", updateError);
          }

          // Log cancellation
          if (userId) {
            await supabase.from("identity_claim_history").insert({
              producer_id: producerId,
              user_id: userId,
              old_status: "pending",
              new_status: "unverified",
              stripe_session_id: session.id,
              rejection_reason: "User canceled verification",
            });
          }
        }
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
