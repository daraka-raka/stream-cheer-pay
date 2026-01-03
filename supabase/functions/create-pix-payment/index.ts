import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  "https://streala.app",
  "https://www.streala.app",
  "https://lovable.dev",
  // Allow preview URLs during development
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is allowed or is a Lovable preview URL
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

interface PixPaymentRequest {
  transaction_id: string;
  alert_title: string;
  amount_cents: number;
  streamer_id: string;
  streamer_handle: string;
  payer_email?: string;
  buyer_note?: string;
  hp_field?: string; // Honeypot field - should be empty
}

// Simple in-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // Max 3 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`[create-pix-payment] Rate limit exceeded for IP: ${ip}`);
    return true;
  }
  
  return false;
}

// Tiered commission rates based on transaction amount in BRL
function getCommissionRate(amountCents: number): number {
  const amountBRL = amountCents / 100;
  
  if (amountBRL <= 500) {
    return 0.05; // 5%
  } else if (amountBRL <= 1000) {
    return 0.04; // 4%
  } else if (amountBRL <= 5000) {
    return 0.03; // 3%
  } else {
    return 0.025; // 2.5%
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";
  
  // Check rate limit
  if (isRateLimited(clientIP)) {
    console.log(`[create-pix-payment] Rate limited request from IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Muitas requisições. Aguarde um minuto e tente novamente." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: PixPaymentRequest = await req.json();
    console.log("[create-pix-payment] Request body received");

    const { transaction_id, alert_title, amount_cents, streamer_id, streamer_handle, payer_email, buyer_note, hp_field } = body;

    // Honeypot check - if filled, it's a bot
    if (hp_field && hp_field.trim() !== "") {
      console.warn(`[create-pix-payment] Honeypot triggered from IP: ${clientIP}`);
      // Return fake success to confuse bots
      return new Response(
        JSON.stringify({ 
          payment_id: "fake_" + Date.now(),
          qr_code_base64: "",
          qr_code: "",
          expires_at: new Date(Date.now() + 300000).toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Input validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const handleRegex = /^[a-z0-9_-]+$/i;

    if (!transaction_id || !uuidRegex.test(transaction_id)) {
      return new Response(
        JSON.stringify({ error: "ID de transação inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!streamer_id || !uuidRegex.test(streamer_id)) {
      return new Response(
        JSON.stringify({ error: "ID de streamer inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!alert_title || typeof alert_title !== "string" || alert_title.length > 200) {
      return new Response(
        JSON.stringify({ error: "Título do alerta inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!streamer_handle || !handleRegex.test(streamer_handle) || streamer_handle.length > 50) {
      return new Response(
        JSON.stringify({ error: "Handle do streamer inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 100 || amount_cents > 100000) {
      return new Response(
        JSON.stringify({ error: "Valor inválido. Mínimo R$ 1,00, máximo R$ 1.000,00" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (buyer_note && (typeof buyer_note !== "string" || buyer_note.length > 200)) {
      return new Response(
        JSON.stringify({ error: "Mensagem muito longa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-pix-payment] Validation passed for transaction:", transaction_id);

    // Update transaction with buyer note if provided
    if (buyer_note) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabaseClient
        .from("transactions")
        .update({ buyer_note })
        .eq("id", transaction_id);
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
    let useStreamerToken = false;

    if (configError || !mpConfig) {
      // Fallback to platform token if streamer hasn't connected MP
      console.log("[create-pix-payment] Using platform token (streamer not connected)");
      const platformToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!platformToken) {
        throw new Error("Streamer não conectou Mercado Pago e token da plataforma não configurado");
      }
      accessToken = platformToken;
    } else {
      console.log("[create-pix-payment] Using streamer's token");
      accessToken = mpConfig.mp_access_token;
      useStreamerToken = true;

      // Check if token might be expired (optional: implement refresh logic)
      if (mpConfig.token_expires_at && new Date(mpConfig.token_expires_at) < new Date()) {
        console.warn("[create-pix-payment] Token may be expired, attempting to use anyway");
      }
    }

    // Get the base URL for webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Calculate commission using tiered rates (only if using streamer's token)
    const commissionRate = useStreamerToken ? getCommissionRate(amount_cents) : 0;
    const transactionAmountReais = amount_cents / 100;
    const applicationFee = Math.round(transactionAmountReais * commissionRate * 100) / 100;
    
    console.log("[create-pix-payment] Tiered commission:", {
      amount_brl: transactionAmountReais,
      rate: `${commissionRate * 100}%`,
      fee: applicationFee,
      using_streamer_token: useStreamerToken
    });

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
    if (useStreamerToken && applicationFee > 0) {
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
