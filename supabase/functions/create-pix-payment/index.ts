import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PixPaymentRequest {
  transaction_id: string;
  alert_title: string;
  amount_cents: number;
  streamer_handle: string;
  payer_email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PixPaymentRequest = await req.json();
    console.log("[create-pix-payment] Request body:", JSON.stringify(body));

    const { transaction_id, alert_title, amount_cents, streamer_handle, payer_email } = body;

    if (!transaction_id || !alert_title || !amount_cents) {
      throw new Error("Missing required fields: transaction_id, alert_title, amount_cents");
    }

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Get the base URL for webhook
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Create PIX payment via Mercado Pago Payments API
    const paymentPayload = {
      transaction_amount: amount_cents / 100,
      description: `Alerta: ${alert_title} - @${streamer_handle}`,
      payment_method_id: "pix",
      payer: {
        email: payer_email || "comprador@streala.app",
      },
      external_reference: transaction_id,
      notification_url: webhookUrl,
    };

    console.log("[create-pix-payment] Creating PIX payment:", JSON.stringify(paymentPayload));

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mercadoPagoToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": transaction_id,
      },
      body: JSON.stringify(paymentPayload),
    });

    const responseText = await response.text();
    console.log("[create-pix-payment] Mercado Pago response status:", response.status);
    console.log("[create-pix-payment] Mercado Pago response:", responseText);

    if (!response.ok) {
      throw new Error(`Mercado Pago API error: ${response.status} - ${responseText}`);
    }

    const payment = JSON.parse(responseText);

    // Extract PIX data from response
    const pointOfInteraction = payment.point_of_interaction;
    const transactionData = pointOfInteraction?.transaction_data;

    if (!transactionData?.qr_code_base64 || !transactionData?.qr_code) {
      console.error("[create-pix-payment] Missing QR code data in response:", JSON.stringify(payment));
      throw new Error("QR code PIX não gerado. Verifique as configurações do Mercado Pago.");
    }

    const result = {
      payment_id: payment.id,
      qr_code_base64: transactionData.qr_code_base64,
      qr_code: transactionData.qr_code,
      expires_at: payment.date_of_expiration,
      ticket_url: transactionData.ticket_url,
    };

    console.log("[create-pix-payment] PIX payment created successfully:", {
      payment_id: result.payment_id,
      expires_at: result.expires_at,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[create-pix-payment] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
