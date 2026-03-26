import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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

interface RefreshRequest {
  streamer_id: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── AUTH: Verify JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[refresh-mp-token] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { streamer_id }: RefreshRequest = await req.json();
    console.log("[refresh-mp-token] Refreshing token for streamer:", streamer_id);

    if (!streamer_id) {
      throw new Error("Missing required field: streamer_id");
    }

    // ── AUTH: Verify ownership ──
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: streamer, error: streamerError } = await supabase
      .from("streamers")
      .select("id, auth_user_id")
      .eq("id", streamer_id)
      .single();

    if (streamerError || !streamer) {
      return new Response(
        JSON.stringify({ error: "Streamer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (streamer.auth_user_id !== user.id) {
      console.error("[refresh-mp-token] Ownership mismatch:", user.id, "!=", streamer.auth_user_id);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch MP config ──
    const { data: mpConfig, error: configError } = await supabase
      .from("streamer_mp_config")
      .select("mp_refresh_token, token_expires_at")
      .eq("streamer_id", streamer_id)
      .single();

    if (configError || !mpConfig) {
      throw new Error("Streamer MP config not found");
    }

    if (!mpConfig.mp_refresh_token) {
      throw new Error("No refresh token available - user needs to reconnect Mercado Pago");
    }

    // Check if token actually needs refresh (expires in less than 1 hour)
    const expiresAt = new Date(mpConfig.token_expires_at);
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    if (expiresAt > oneHourFromNow) {
      console.log("[refresh-mp-token] Token still valid, no refresh needed");
      return new Response(
        JSON.stringify({ success: true, message: "Token still valid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("MP_CLIENT_ID");
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("MP_CLIENT_ID or MP_CLIENT_SECRET not configured");
    }

    console.log("[refresh-mp-token] Refreshing expired token...");

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: mpConfig.mp_refresh_token,
      }),
    });

    const tokenText = await tokenResponse.text();
    console.log("[refresh-mp-token] Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("[refresh-mp-token] OAuth refresh error:", tokenText);
      throw new Error(`OAuth refresh error: ${tokenText}`);
    }

    const tokens = JSON.parse(tokenText);
    console.log("[refresh-mp-token] New token received for user_id:", tokens.user_id);

    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 21600));

    const { error: updateError } = await supabase
      .from("streamer_mp_config")
      .update({
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token || mpConfig.mp_refresh_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("streamer_id", streamer_id);

    if (updateError) {
      console.error("[refresh-mp-token] Database update error:", updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    console.log("[refresh-mp-token] Token refreshed successfully for streamer:", streamer_id);

    return new Response(
      JSON.stringify({ success: true, expires_at: newExpiresAt.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[refresh-mp-token] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
