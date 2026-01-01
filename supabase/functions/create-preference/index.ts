import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  "https://streala.app",
  "https://www.streala.app",
  "https://lovable.dev",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovableproject.com") ||
    origin.endsWith(".lovable.app")
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_id, alert_title, amount_cents, streamer_handle } = await req.json();

    console.log("[create-preference] Received request:", { transaction_id, alert_title, amount_cents, streamer_handle });

    if (!transaction_id || !alert_title || !amount_cents || !streamer_handle) {
      throw new Error("Missing required fields: transaction_id, alert_title, amount_cents, streamer_handle");
    }

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Get the origin for back_urls
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const backUrl = `${origin}/@${streamer_handle}`;

    const preferenceData = {
      items: [
        {
          id: transaction_id,
          title: `Alerta: ${alert_title}`,
          quantity: 1,
          unit_price: amount_cents / 100, // Mercado Pago expects value in reais
          currency_id: "BRL",
        },
      ],
      back_urls: {
        success: `${backUrl}?payment=success`,
        failure: `${backUrl}?payment=failure`,
        pending: `${backUrl}?payment=pending`,
      },
      auto_return: "approved",
      external_reference: transaction_id,
      notification_url: webhookUrl,
      statement_descriptor: "STREALA",
      expires: false,
    };

    console.log("[create-preference] Creating preference with data:", JSON.stringify(preferenceData));

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mercadoPagoToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[create-preference] Mercado Pago API error:", response.status, errorText);
      throw new Error(`Mercado Pago API error: ${response.status} - ${errorText}`);
    }

    const preference = await response.json();
    console.log("[create-preference] Preference created:", preference.id);

    return new Response(
      JSON.stringify({
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[create-preference] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
