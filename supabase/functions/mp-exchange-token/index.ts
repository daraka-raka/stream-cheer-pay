import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  code: string;
  streamer_id: string;
  redirect_uri: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, streamer_id, redirect_uri }: TokenRequest = await req.json();
    console.log("[mp-exchange-token] Received request for streamer:", streamer_id);

    if (!code || !streamer_id || !redirect_uri) {
      throw new Error("Missing required fields: code, streamer_id, redirect_uri");
    }

    const clientId = Deno.env.get("MP_CLIENT_ID");
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("MP_CLIENT_ID or MP_CLIENT_SECRET not configured");
    }

    console.log("[mp-exchange-token] Exchanging code for tokens...");

    // Exchange authorization code for tokens
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
      throw new Error(`OAuth error: ${tokenText}`);
    }

    const tokens = JSON.parse(tokenText);
    console.log("[mp-exchange-token] Tokens received for user_id:", tokens.user_id);

    // Validate required fields from response
    if (!tokens.access_token || !tokens.user_id) {
      throw new Error("Invalid token response from Mercado Pago");
    }

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 21600));

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert streamer MP config
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
      throw new Error(`Database error: ${upsertError.message}`);
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
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
