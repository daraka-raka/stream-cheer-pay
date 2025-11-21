import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

interface Notification {
  id: string;
  streamer_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streamerId, setStreamerId] = useState<string | null>(null);

  // Load streamer ID
  useEffect(() => {
    const loadStreamerId = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("streamers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (error) throw error;
        setStreamerId(data.id);
      } catch (error) {
        console.error("Error loading streamer ID:", error);
      }
    };

    loadStreamerId();
  }, [user]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!streamerId) return;

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("streamer_id", streamerId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount(data?.filter((n) => !n.read).length || 0);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [streamerId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!streamerId) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `streamer_id=eq.${streamerId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.link
              ? {
                  label: "Ver",
                  onClick: () => window.location.href = newNotification.link!,
                }
              : undefined,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `streamer_id=eq.${streamerId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          setUnreadCount((prev) =>
            updated.read ? Math.max(0, prev - 1) : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  const markAllAsRead = async () => {
    if (!streamerId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("streamer_id", streamerId)
        .eq("read", false);

      if (error) throw error;

      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erro ao marcar notificações como lidas");
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
};
