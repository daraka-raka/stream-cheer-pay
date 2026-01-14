import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTestAlertRequest {
  action: "create_test";
  alert_id: string;
}

interface UpdateStatusRequest {
  action: "update_status";
  queue_id: number;
  status: "playing" | "finished";
  public_key: string;
}

type RequestBody = CreateTestAlertRequest | UpdateStatusRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body: RequestBody = await req.json();
    console.log("[manage-alert-queue] Request:", body);

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (body.action === "create_test") {
      // Authenticate user for test alerts
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user client to verify auth
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Get authenticated user
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        console.error("[manage-alert-queue] Auth error:", userError);
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[manage-alert-queue] Authenticated user:", user.id);

      // Get streamer profile
      const { data: streamer, error: streamerError } = await supabaseAdmin
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (streamerError || !streamer) {
        console.error("[manage-alert-queue] Streamer not found:", streamerError);
        return new Response(
          JSON.stringify({ error: "Streamer not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify alert belongs to streamer
      const { data: alert, error: alertError } = await supabaseAdmin
        .from("alerts")
        .select("id, streamer_id")
        .eq("id", body.alert_id)
        .single();

      if (alertError || !alert) {
        console.error("[manage-alert-queue] Alert not found:", alertError);
        return new Response(
          JSON.stringify({ error: "Alert not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (alert.streamer_id !== streamer.id) {
        console.error("[manage-alert-queue] Alert ownership mismatch");
        return new Response(
          JSON.stringify({ error: "Not authorized to test this alert" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting: max 10 test alerts per hour per streamer
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabaseAdmin
        .from("alert_queue")
        .select("*", { count: "exact", head: true })
        .eq("streamer_id", streamer.id)
        .eq("is_test", true)
        .gte("enqueued_at", oneHourAgo);

      if (!countError && count !== null && count >= 10) {
        console.log("[manage-alert-queue] Rate limit exceeded:", count);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Max 10 test alerts per hour." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert test alert into queue
      const { error: insertError } = await supabaseAdmin
        .from("alert_queue")
        .insert({
          streamer_id: streamer.id,
          alert_id: body.alert_id,
          transaction_id: null,
          is_test: true,
          status: "queued",
          payload: { buyer_note: "🧪 Alerta de teste" },
        });

      if (insertError) {
        console.error("[manage-alert-queue] Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create test alert" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[manage-alert-queue] Test alert created successfully");
      return new Response(
        JSON.stringify({ success: true, message: "Test alert created" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "update_status") {
      // Widget status update - validate public key
      if (!body.public_key || !body.queue_id || !body.status) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate status value
      if (!["playing", "finished"].includes(body.status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get streamer by public key
      const { data: streamer, error: streamerError } = await supabaseAdmin
        .from("streamers")
        .select("id")
        .eq("public_key", body.public_key)
        .single();

      if (streamerError || !streamer) {
        console.error("[manage-alert-queue] Invalid public key:", streamerError);
        return new Response(
          JSON.stringify({ error: "Invalid public key" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify queue item belongs to streamer
      const { data: queueItem, error: queueError } = await supabaseAdmin
        .from("alert_queue")
        .select("id, streamer_id")
        .eq("id", body.queue_id)
        .single();

      if (queueError || !queueItem) {
        console.error("[manage-alert-queue] Queue item not found:", queueError);
        return new Response(
          JSON.stringify({ error: "Queue item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (queueItem.streamer_id !== streamer.id) {
        console.error("[manage-alert-queue] Queue item ownership mismatch");
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update queue status
      const updateData: Record<string, any> = {
        status: body.status,
      };

      if (body.status === "playing") {
        updateData.started_at = new Date().toISOString();
      } else if (body.status === "finished") {
        updateData.finished_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseAdmin
        .from("alert_queue")
        .update(updateData)
        .eq("id", body.queue_id);

      if (updateError) {
        console.error("[manage-alert-queue] Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[manage-alert-queue] Status updated:", body.queue_id, body.status);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[manage-alert-queue] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
