import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PixPaymentRequest {
  transaction_id: string;
  alert_title: string;
  amount_cents: number;
  streamer_id: string;
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

    const { transaction_id, alert_title, amount_cents, streamer_id, streamer_handle, payer_email } = body;

    if (!transaction_id || !alert_title || !amount_cents || !streamer_id) {
      throw new Error("Missing required fields: transaction_id, alert_title, amount_cents, streamer_id");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch streamer's Mercado Pago config
    const { data: mpConfig, error: configError } = await supabase
      .from("streamer_mp_config")
      .select("mp_access_token, commission_rate, token_expires_at")
      .eq("streamer_id", streamer_id)
      .single();

    let accessToken: string;
    let commissionRate: number;

    if (configError || !mpConfig) {
      // Fallback to platform token if streamer hasn't connected MP
      console.log("[create-pix-payment] Using platform token (streamer not connected)");
      const platformToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!platformToken) {
        throw new Error("Streamer não conectou Mercado Pago e token da plataforma não configurado");
      }
      accessToken = platformToken;
      commissionRate = 0; // No split if using platform token
    } else {
      console.log("[create-pix-payment] Using streamer's token");
      accessToken = mpConfig.mp_access_token;
      commissionRate = mpConfig.commission_rate || 0.10;

      // Check if token might be expired (optional: implement refresh logic)
      if (mpConfig.token_expires_at && new Date(mpConfig.token_expires_at) < new Date()) {
        console.warn("[create-pix-payment] Token may be expired, attempting to use anyway");
        // TODO: Implement token refresh logic here if needed
      }
    }

    // Get the base URL for webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Calculate application fee (platform commission)
    const transactionAmountReais = amount_cents / 100;
    const applicationFee = commissionRate > 0 ? Math.round(transactionAmountReais * commissionRate * 100) / 100 : 0;

    // Create PIX payment payload
    const paymentPayload: Record<string, unknown> = {
      transaction_amount: transactionAmountReais,
      description: `Alerta: ${alert_title} - @${streamer_handle}`,
      payment_method_id: "pix",
      payer: {
        email: payer_email || "comprador@streala.app",
      },
      external_reference: transaction_id,
      notification_url: webhookUrl,
    };

    // Add application_fee only if using streamer's token (marketplace split)
    if (commissionRate > 0 && applicationFee > 0) {
      paymentPayload.application_fee = applicationFee;
      console.log("[create-pix-payment] Application fee (commission):", applicationFee);
    }

    console.log("[create-pix-payment] Creating PIX payment:", JSON.stringify(paymentPayload));

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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
      commission_applied: applicationFee,
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
