import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface TokenRequest {
  code: string;
  streamer_id: string;
  redirect_uri: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // === AUTHENTICATION: Validate JWT and ownership ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[mp-exchange-token] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, streamer_id, redirect_uri }: TokenRequest = await req.json();
    console.log("[mp-exchange-token] Received request for streamer:", streamer_id);

    if (!code || !streamer_id || !redirect_uri) {
      throw new Error("Missing required fields: code, streamer_id, redirect_uri");
    }

    // === AUTHORIZATION: Verify user owns this streamer_id ===
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: streamer, error: streamerError } = await supabase
      .from("streamers")
      .select("id")
      .eq("id", streamer_id)
      .eq("auth_user_id", user.id)
      .single();

    if (streamerError || !streamer) {
      console.error("[mp-exchange-token] Ownership check failed:", streamerError);
      return new Response(
        JSON.stringify({ error: "Não autorizado para este perfil" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("MP_CLIENT_ID");
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("MP_CLIENT_ID or MP_CLIENT_SECRET not configured");
    }

    console.log("[mp-exchange-token] Exchanging code for tokens...");

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirect_uri,
      }),
    });

    const tokenText = await tokenResponse.text();
    console.log("[mp-exchange-token] Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("[mp-exchange-token] OAuth error:", tokenText);
      return new Response(
        JSON.stringify({ error: "Erro ao trocar código OAuth. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = JSON.parse(tokenText);
    console.log("[mp-exchange-token] Tokens received for user_id:", tokens.user_id);

    if (!tokens.access_token || !tokens.user_id) {
      throw new Error("Invalid token response from Mercado Pago");
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 21600));

    const { error: upsertError } = await supabase
      .from("streamer_mp_config")
      .upsert({
        streamer_id: streamer_id,
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token || null,
        mp_user_id: String(tokens.user_id),
        mp_public_key: tokens.public_key || null,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: "streamer_id" 
      });

    if (upsertError) {
      console.error("[mp-exchange-token] Database error:", upsertError);
      throw new Error("Erro ao salvar configuração");
    }

    console.log("[mp-exchange-token] Config saved successfully for streamer:", streamer_id);

    return new Response(
      JSON.stringify({ success: true, mp_user_id: tokens.user_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[mp-exchange-token] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Erro interno ao conectar conta" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
