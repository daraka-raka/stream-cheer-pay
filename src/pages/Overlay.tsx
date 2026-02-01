import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertPlayer } from "@/components/AlertPlayer";

interface QueueItem {
  id: number;
  alert_id: string;
  payload?: any;
}

interface WidgetSettings {
  streamer_id: string;
  overlay_image_duration_seconds: number;
  widget_position: string;
  alert_start_delay_seconds: number;
  alert_between_delay_seconds: number;
}

const Overlay = () => {
  const [searchParams] = useSearchParams();
  const publicKey = searchParams.get("key");

  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Load settings from public view
  useEffect(() => {
    if (!publicKey) {
      setError("Missing key parameter");
      return;
    }

    const loadSettings = async () => {
      console.log("[Overlay] Loading settings for key:", publicKey);

      const { data, error: fetchError } = await supabase
        .from("public_widget_settings")
        .select("*")
        .eq("public_key", publicKey)
        .single();

      if (fetchError) {
        console.error("[Overlay] Error loading settings:", fetchError);
        setError("Invalid key or streamer not found");
        return;
      }

      if (data) {
        console.log("[Overlay] Settings loaded:", data);
        setSettings({
          streamer_id: data.streamer_id,
          overlay_image_duration_seconds: data.overlay_image_duration_seconds ?? 5,
          widget_position: data.widget_position ?? "center",
          alert_start_delay_seconds: data.alert_start_delay_seconds ?? 0,
          alert_between_delay_seconds: data.alert_between_delay_seconds ?? 1,
        });
      }
    };

    loadSettings();
  }, [publicKey]);

  // Load pending alerts
  useEffect(() => {
    if (!settings?.streamer_id) return;

    const loadPendingAlerts = async () => {
      console.log("[Overlay] Loading pending alerts for streamer:", settings.streamer_id);

      const { data: pendingAlerts } = await supabase
        .from("alert_queue")
        .select("*")
        .eq("streamer_id", settings.streamer_id)
        .eq("status", "queued")
        .order("enqueued_at", { ascending: true });

      if (pendingAlerts && pendingAlerts.length > 0) {
        console.log("[Overlay] Found pending alerts:", pendingAlerts.length);
        setQueue(pendingAlerts);
      }
    };

    loadPendingAlerts();
  }, [settings?.streamer_id]);

  // Realtime subscription
  useEffect(() => {
    if (!settings?.streamer_id) return;

    console.log("[Overlay] Setting up realtime for streamer:", settings.streamer_id);

    const channel = supabase
      .channel(`overlay-queue-${settings.streamer_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_queue",
          filter: `streamer_id=eq.${settings.streamer_id}`,
        },
        (payload) => {
          console.log("[Overlay] New alert received:", payload.new);
          setQueue((prev) => [...prev, payload.new as QueueItem]);
        }
      )
      .subscribe((status) => {
        console.log("[Overlay] Realtime status:", status);
      });

    return () => {
      console.log("[Overlay] Cleaning up realtime");
      supabase.removeChannel(channel);
    };
  }, [settings?.streamer_id]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (currentAlert || queue.length === 0 || !settings || !publicKey) return;

    const nextItem = queue[0];
    console.log("[Overlay] Processing alert:", nextItem.id);

    // Remove from local queue immediately
    setQueue((prev) => prev.slice(1));

    // Apply start delay
    if (settings.alert_start_delay_seconds > 0) {
      console.log(`[Overlay] Waiting ${settings.alert_start_delay_seconds}s before showing...`);
      await new Promise((resolve) => setTimeout(resolve, settings.alert_start_delay_seconds * 1000));
    }

    // Update status to playing
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
  }, [queue, currentAlert, settings, publicKey]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  // Handle alert completion
  const handleAlertComplete = useCallback(async () => {
    if (!currentAlert || !publicKey || !settings) return;

    console.log("[Overlay] Alert completed:", currentAlert.queueId);

    // Update status to done
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
  }, [currentAlert, publicKey, settings]);

  // Position classes
  const getPositionClasses = () => {
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
    return positions[settings?.widget_position ?? "center"] || "items-center justify-center";
  };

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-transparent flex items-center justify-center">
        <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  // Loading state
  if (!settings) {
    return <div className="fixed inset-0 bg-transparent" />;
  }

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
          duration={settings.overlay_image_duration_seconds}
          onComplete={handleAlertComplete}
        />
      )}
    </div>
  );
};

export default Overlay;
