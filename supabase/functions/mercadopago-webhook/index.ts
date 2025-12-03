import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json();
    
    console.log("[mercadopago-webhook] Received webhook:", JSON.stringify(body));
    console.log("[mercadopago-webhook] Query params:", Object.fromEntries(url.searchParams));

    // Mercado Pago sends different types of notifications
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      console.log("[mercadopago-webhook] Ignoring non-payment notification:", body.type, body.action);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log("[mercadopago-webhook] No payment ID in webhook body");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Fetch payment details from Mercado Pago
    console.log("[mercadopago-webhook] Fetching payment details for:", paymentId);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${mercadoPagoToken}`,
      },
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("[mercadopago-webhook] Error fetching payment:", paymentResponse.status, errorText);
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    console.log("[mercadopago-webhook] Payment details:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    });

    const transactionId = payment.external_reference;
    if (!transactionId) {
      console.log("[mercadopago-webhook] No external_reference (transaction_id) in payment");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only process approved payments
    if (payment.status === "approved") {
      console.log("[mercadopago-webhook] Payment approved, processing transaction:", transactionId);

      // Get transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*, alerts(*)")
        .eq("id", transactionId)
        .single();

      if (fetchError || !transaction) {
        console.error("[mercadopago-webhook] Transaction not found:", transactionId, fetchError);
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      // Check if already processed
      if (transaction.status === "paid") {
        console.log("[mercadopago-webhook] Transaction already paid, skipping:", transactionId);
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate fees (example: 3.99% Mercado Pago + 5% Streala)
      const amountCents = Math.round(payment.transaction_amount * 100);
      const feeMpCents = Math.round(amountCents * 0.0399);
      const feeStrealaCents = Math.round(amountCents * 0.05);
      const amountStreamerCents = amountCents - feeMpCents - feeStrealaCents;

      // Update transaction status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "paid",
          stripe_payment_id: String(payment.id), // Reusing field for MP payment ID
          fee_stripe_cents: feeMpCents,
          fee_streala_cents: feeStrealaCents,
          amount_streamer_cents: amountStreamerCents,
        })
        .eq("id", transactionId);

      if (updateError) {
        console.error("[mercadopago-webhook] Error updating transaction:", updateError);
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }

      // Add to alert queue
      const { error: queueError } = await supabase
        .from("alert_queue")
        .insert({
          transaction_id: transactionId,
          alert_id: transaction.alert_id,
          streamer_id: transaction.streamer_id,
          status: "queued",
          is_test: false,
          payload: { buyer_note: transaction.buyer_note },
        });

      if (queueError) {
        console.error("[mercadopago-webhook] Error adding to queue:", queueError);
        // Don't throw, transaction is already marked as paid
      }

      // Create notification for streamer
      const alertTitle = transaction.alerts?.title || "Alerta";
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          streamer_id: transaction.streamer_id,
          type: "sale",
          title: "Nova venda!",
          message: `Você vendeu o alerta "${alertTitle}" por R$ ${(amountCents / 100).toFixed(2)}`,
          link: "/transactions",
        });

      if (notifError) {
        console.error("[mercadopago-webhook] Error creating notification:", notifError);
        // Don't throw, transaction is already marked as paid
      }

      console.log("[mercadopago-webhook] Payment processed successfully:", transactionId);
    } else {
      console.log("[mercadopago-webhook] Payment not approved, status:", payment.status);
      
      // Optionally update transaction status for failed/pending payments
      if (payment.status === "rejected" || payment.status === "cancelled") {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", transactionId);
      }
    }

    // Always return 200 to prevent Mercado Pago from retrying
    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[mercadopago-webhook] Error:", errorMessage);
    // Still return 200 to prevent infinite retries
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
