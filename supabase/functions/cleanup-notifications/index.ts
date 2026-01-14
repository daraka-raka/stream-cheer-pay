import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[cleanup-notifications] Starting cleanup...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all settings with retention configured
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("streamer_id, notification_retention_days")
      .not("notification_retention_days", "is", null);

    if (settingsError) {
      throw settingsError;
    }

    console.log(`[cleanup-notifications] Found ${settings?.length || 0} streamers with retention configured`);

    let totalDeleted = 0;

    for (const setting of settings || []) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - setting.notification_retention_days);

      console.log(`[cleanup-notifications] Processing streamer ${setting.streamer_id}, cutoff date: ${cutoffDate.toISOString()}`);

      const { data: deletedData, error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("streamer_id", setting.streamer_id)
        .lt("created_at", cutoffDate.toISOString())
        .select("id");

      if (deleteError) {
        console.error(`[cleanup-notifications] Error deleting for streamer ${setting.streamer_id}:`, deleteError);
        continue;
      }

      const deletedCount = deletedData?.length || 0;
      totalDeleted += deletedCount;
      
      console.log(`[cleanup-notifications] Deleted ${deletedCount} notifications for streamer ${setting.streamer_id}`);
    }

    console.log(`[cleanup-notifications] Total deleted: ${totalDeleted}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: totalDeleted,
        processed_streamers: settings?.length || 0
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[cleanup-notifications] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
