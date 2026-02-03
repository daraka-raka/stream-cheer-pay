import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertPlayer } from "@/components/AlertPlayer";

interface WidgetSettings {
  streamer_id: string;
  overlay_image_duration_seconds: number;
  widget_position: string;
  alert_start_delay_seconds: number;
  alert_between_delay_seconds: number;
}

interface QueueItem {
  id: number;
  alert_id: string;
  payload?: any;
}

type OverlayStatus = 
  | { type: "loading" }
  | { type: "missing_key" }
  | { type: "invalid_key"; error?: string }
  | { type: "ready"; settings: WidgetSettings };

const Overlay = () => {
  const [searchParams] = useSearchParams();
  const publicKey = searchParams.get("key");
  const debugMode = searchParams.get("debug") === "1";

  const [status, setStatus] = useState<OverlayStatus>({ type: "loading" });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentAlert, setCurrentAlert] = useState<any>(null);

  // Force transparent background
  useEffect(() => {
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";
    document.documentElement.style.background = "transparent";

    return () => {
      document.body.style.background = "";
      document.body.style.overflow = "";
      document.documentElement.style.background = "";
    };
  }, []);

  // Step 1: Validate key and load settings
  useEffect(() => {
    if (!publicKey) {
      console.log("[Overlay] No key parameter provided");
      setStatus({ type: "missing_key" });
      return;
    }

    const loadSettings = async () => {
      console.log("[Overlay] Loading settings for key:", publicKey);

      try {
        const { data, error } = await supabase
          .from("public_widget_settings")
          .select("*")
          .eq("public_key", publicKey)
          .single();

        if (error) {
          console.error("[Overlay] Error loading settings:", error);
          setStatus({ 
            type: "invalid_key", 
            error: debugMode ? `DB Error: ${error.message} (${error.code})` : undefined 
          });
          return;
        }

        if (!data) {
          console.log("[Overlay] No settings found for key");
          setStatus({ type: "invalid_key" });
          return;
        }

        console.log("[Overlay] Settings loaded successfully:", data);
        setStatus({
          type: "ready",
          settings: {
            streamer_id: data.streamer_id!,
            overlay_image_duration_seconds: data.overlay_image_duration_seconds ?? 5,
            widget_position: data.widget_position ?? "center",
            alert_start_delay_seconds: data.alert_start_delay_seconds ?? 0,
            alert_between_delay_seconds: data.alert_between_delay_seconds ?? 1,
          },
        });
      } catch (err) {
        console.error("[Overlay] Unexpected error:", err);
        setStatus({ 
          type: "invalid_key", 
          error: debugMode ? `Exception: ${String(err)}` : undefined 
        });
      }
    };

    loadSettings();
  }, [publicKey, debugMode]);

  // Step 2: Load pending alerts (only when ready)
  useEffect(() => {
    if (status.type !== "ready") return;

    const loadPendingAlerts = async () => {
      console.log("[Overlay] Loading pending alerts for streamer:", status.settings.streamer_id);

      try {
        const { data: pendingAlerts, error } = await supabase
          .from("alert_queue")
          .select("id, alert_id, payload")
          .eq("streamer_id", status.settings.streamer_id)
          .eq("status", "queued")
          .order("enqueued_at", { ascending: true });

        if (error) {
          console.error("[Overlay] Error loading queue:", error);
          return;
        }

        if (pendingAlerts && pendingAlerts.length > 0) {
          console.log("[Overlay] Found pending alerts:", pendingAlerts.length);
          setQueue(pendingAlerts);
        } else {
          console.log("[Overlay] No pending alerts in queue");
        }
      } catch (err) {
        console.error("[Overlay] Unexpected error loading queue:", err);
      }
    };

    loadPendingAlerts();
  }, [status]);

  // Step 3: Realtime subscription (only when ready)
  useEffect(() => {
    if (status.type !== "ready") return;

    const streamerId = status.settings.streamer_id;
    console.log("[Overlay] Setting up realtime for streamer:", streamerId);

    const channel = supabase
      .channel(`overlay-queue-${streamerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_queue",
          filter: `streamer_id=eq.${streamerId}`,
        },
        (payload) => {
          console.log("[Overlay] New alert received:", payload.new);
          const newItem = payload.new as QueueItem;
          setQueue((prev) => [...prev, newItem]);
        }
      )
      .subscribe((subStatus) => {
        console.log("[Overlay] Realtime status:", subStatus);
      });

    return () => {
      console.log("[Overlay] Cleaning up realtime");
      supabase.removeChannel(channel);
    };
  }, [status]);

  // Step 4: Process queue
  const processQueue = useCallback(async () => {
    if (status.type !== "ready") return;
    if (currentAlert || queue.length === 0) return;

    const { settings } = status;
    const nextItem = queue[0];
    console.log("[Overlay] Processing alert:", nextItem.id);

    // Remove from local queue immediately
    setQueue((prev) => prev.slice(1));

    // Apply start delay
    if (settings.alert_start_delay_seconds > 0) {
      console.log(`[Overlay] Waiting ${settings.alert_start_delay_seconds}s before showing...`);
      await new Promise((resolve) => setTimeout(resolve, settings.alert_start_delay_seconds * 1000));
    }

    // Update status to playing via edge function
    try {
      await supabase.functions.invoke("manage-alert-queue", {
        body: {
          action: "update_status",
          queue_id: nextItem.id,
          status: "playing",
          public_key: publicKey,
        },
      });
    } catch (err) {
      console.error("[Overlay] Error updating status to playing:", err);
    }

    // Load alert details
    try {
      const { data: alert, error: alertError } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", nextItem.alert_id)
        .single();

      if (alertError) {
        console.error("[Overlay] Error loading alert:", alertError);
        return;
      }

      if (alert) {
        console.log("[Overlay] Showing alert:", alert.title);
        setCurrentAlert({
          ...alert,
          queueId: nextItem.id,
          buyerName: nextItem.payload?.buyer_name,
          buyerNote: nextItem.payload?.buyer_note,
        });
      }
    } catch (err) {
      console.error("[Overlay] Unexpected error loading alert:", err);
    }
  }, [queue, currentAlert, status, publicKey]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  // Step 5: Handle alert completion
  const handleAlertComplete = useCallback(async () => {
    if (status.type !== "ready" || !currentAlert) return;

    const { settings } = status;
    console.log("[Overlay] Alert completed:", currentAlert.queueId);

    // Update status to done via edge function
    try {
      await supabase.functions.invoke("manage-alert-queue", {
        body: {
          action: "update_status",
          queue_id: currentAlert.queueId,
          status: "done",
          public_key: publicKey,
        },
      });
    } catch (err) {
      console.error("[Overlay] Error updating status to done:", err);
    }

    // Apply between-alerts delay
    if (settings.alert_between_delay_seconds > 0) {
      console.log(`[Overlay] Waiting ${settings.alert_between_delay_seconds}s before next alert...`);
      setTimeout(() => setCurrentAlert(null), settings.alert_between_delay_seconds * 1000);
    } else {
      setCurrentAlert(null);
    }
  }, [currentAlert, publicKey, status]);

  // Position classes
  const getPositionClasses = () => {
    if (status.type !== "ready") return "items-center justify-center";
    
    const positions: Record<string, string> = {
      "top-left": "items-start justify-start",
      "top-center": "items-start justify-center",
      "top-right": "items-start justify-end",
      "center-left": "items-center justify-start",
      center: "items-center justify-center",
      "center-right": "items-center justify-end",
      "bottom-left": "items-end justify-start",
      "bottom-center": "items-end justify-center",
      "bottom-right": "items-end justify-end",
    };
    return positions[status.settings.widget_position] || "items-center justify-center";
  };

  // Debug overlay component
  const DebugOverlay = () => {
    if (!debugMode) return null;
    
    return (
      <div className="fixed bottom-2 left-2 bg-black/80 text-white text-xs p-2 rounded font-mono max-w-sm">
        <div className="font-bold mb-1">🔧 Debug Mode</div>
        <div>Status: {status.type}</div>
        {status.type === "ready" && (
          <>
            <div>Streamer: {status.settings.streamer_id.slice(0, 8)}...</div>
            <div>Position: {status.settings.widget_position}</div>
            <div>Duration: {status.settings.overlay_image_duration_seconds}s</div>
            <div>Queue: {queue.length} items</div>
            <div>Playing: {currentAlert ? "Yes" : "No"}</div>
          </>
        )}
        {status.type === "invalid_key" && status.error && (
          <div className="text-red-400 break-all">{status.error}</div>
        )}
      </div>
    );
  };

  // Render based on status
  if (status.type === "loading") {
    return (
      <div className="fixed inset-0" style={{ background: "transparent" }}>
        <DebugOverlay />
      </div>
    );
  }

  if (status.type === "missing_key") {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          ❌ Missing key parameter
        </div>
        <DebugOverlay />
      </div>
    );
  }

  if (status.type === "invalid_key") {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          ❌ Invalid key
        </div>
        <DebugOverlay />
      </div>
    );
  }

  // Ready state - show alerts
  return (
    <div 
      className={`fixed inset-0 flex p-8 ${getPositionClasses()}`}
      style={{ background: "transparent" }}
    >
      {currentAlert && (
        <AlertPlayer
          alert={currentAlert}
          buyerName={currentAlert.buyerName}
          buyerNote={currentAlert.buyerNote}
          duration={status.settings.overlay_image_duration_seconds}
          onComplete={handleAlertComplete}
        />
      )}
      <DebugOverlay />
    </div>
  );
};

export default Overlay;
