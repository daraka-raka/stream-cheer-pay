import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertPlayer } from "@/components/AlertPlayer";

interface QueueItem {
  id: number;
  alert_id: string;
  payload?: any;
}

const WidgetOverlay = () => {
  const { publicKey } = useParams();
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [duration, setDuration] = useState(5);
  const [widgetPosition, setWidgetPosition] = useState("center");
  const [alertStartDelay, setAlertStartDelay] = useState(0);
  const [alertBetweenDelay, setAlertBetweenDelay] = useState(1);

  // Set transparent background for widget
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

  // Load streamer and settings via public view (no RLS required)
  useEffect(() => {
    const loadStreamerAndSettings = async () => {
      if (!publicKey) return;

      // Use the public_widget_settings view that exposes only necessary data
      const { data: widgetSettings, error } = await supabase
        .from("public_widget_settings")
        .select("*")
        .eq("public_key", publicKey)
        .single();

      if (error) {
        console.error("[Widget] Error loading settings:", error);
        return;
      }

      if (widgetSettings) {
        setStreamerId(widgetSettings.streamer_id);
        
        if (widgetSettings.overlay_image_duration_seconds) {
          setDuration(widgetSettings.overlay_image_duration_seconds);
        }
        if (widgetSettings.widget_position) {
          setWidgetPosition(widgetSettings.widget_position);
        }
        if (widgetSettings.alert_start_delay_seconds !== undefined) {
          setAlertStartDelay(widgetSettings.alert_start_delay_seconds);
        }
        if (widgetSettings.alert_between_delay_seconds !== undefined) {
          setAlertBetweenDelay(widgetSettings.alert_between_delay_seconds);
        }
      }
    };

    loadStreamerAndSettings();
  }, [publicKey]);

  // Load pending alerts on mount
  useEffect(() => {
    if (!streamerId) return;

    const loadPendingAlerts = async () => {
      const { data: pendingAlerts } = await supabase
        .from("alert_queue")
        .select("*")
        .eq("streamer_id", streamerId)
        .eq("status", "queued")
        .order("enqueued_at", { ascending: true });

      if (pendingAlerts && pendingAlerts.length > 0) {
        setQueue(pendingAlerts);
      }
    };

    loadPendingAlerts();
  }, [streamerId]);

  // Set up realtime listener
  useEffect(() => {
    if (!streamerId) return;

    console.log("[Widget] Setting up realtime listener for streamer:", streamerId);

    const channel = supabase
      .channel("alert-queue")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_queue",
          filter: `streamer_id=eq.${streamerId}`,
        },
        (payload) => {
          console.log("[Widget] New alert received:", payload.new);
          setQueue((prev) => [...prev, payload.new as QueueItem]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  // Process queue
  useEffect(() => {
    if (currentAlert || queue.length === 0) return;

    const processNext = async () => {
      const nextItem = queue[0];
      console.log("[Widget] Processing alert:", nextItem.id);

      // Delay before showing alert
      if (alertStartDelay > 0) {
        console.log(`[Widget] Waiting ${alertStartDelay}s before showing...`);
        await new Promise(resolve => setTimeout(resolve, alertStartDelay * 1000));
      }

      // Update status to playing via edge function
      if (publicKey) {
        await supabase.functions.invoke("manage-alert-queue", {
          body: {
            action: "update_status",
            queue_id: nextItem.id,
            status: "playing",
            public_key: publicKey,
          },
        });
      }

      // Load alert details
      const { data: alert } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", nextItem.alert_id)
        .single();

      if (alert) {
        setCurrentAlert({
          ...alert,
          queueId: nextItem.id,
          buyerNote: nextItem.payload?.buyer_note,
        });
      }

      // Remove from queue
      setQueue((prev) => prev.slice(1));
    };

    processNext();
  }, [queue, currentAlert, alertStartDelay]);

  const handleAlertComplete = async () => {
    if (!currentAlert) return;

    console.log("[Widget] Alert completed:", currentAlert.queueId);

    // Update status to finished via edge function
    if (publicKey) {
      await supabase.functions.invoke("manage-alert-queue", {
        body: {
          action: "update_status",
          queue_id: currentAlert.queueId,
          status: "finished",
          public_key: publicKey,
        },
      });
    }

    // Delay between alerts before clearing current
    if (alertBetweenDelay > 0) {
      console.log(`[Widget] Waiting ${alertBetweenDelay}s before next alert...`);
      setTimeout(() => setCurrentAlert(null), alertBetweenDelay * 1000);
    } else {
      setCurrentAlert(null);
    }
  };

  const getPositionClasses = () => {
    const positions: Record<string, string> = {
      "top-left": "items-start justify-start",
      "top-center": "items-start justify-center",
      "top-right": "items-start justify-end",
      "center-left": "items-center justify-start",
      "center": "items-center justify-center",
      "center-right": "items-center justify-end",
      "bottom-left": "items-end justify-start",
      "bottom-center": "items-end justify-center",
      "bottom-right": "items-end justify-end",
    };
    return positions[widgetPosition] || "items-center justify-center";
  };

  return (
    <div className={`fixed inset-0 bg-transparent flex p-4 ${getPositionClasses()}`}>
      {currentAlert && (
        <AlertPlayer
          alert={currentAlert}
          buyerNote={currentAlert.buyerNote}
          duration={duration}
          onComplete={handleAlertComplete}
        />
      )}
    </div>
  );
};

export default WidgetOverlay;
