import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface Streamer {
  id: string;
  handle: string;
  display_name: string;
  public_key: string;
}

export interface DashboardStats {
  totalRevenue: number;
  last7Days: number;
  last7DaysGrowth: number;
  alertsCount: number;
  queueCount: number;
  conversionRate: number;
  totalTransactions: number;
  avgTicket: number;
  pendingCount: number;
}

export interface DashboardSettings {
  showTicketMedio: boolean;
  showTaxaConversao: boolean;
  showPendentes: boolean;
}

export interface TopAlert {
  id: string;
  title: string;
  thumb_path: string | null;
  price_cents: number;
  sales_count: number;
  total_revenue: number;
}

export interface QueueItem {
  id: number;
  status: string;
  enqueued_at: string;
  started_at: string | null;
  finished_at: string | null;
  alerts: {
    title: string;
    thumb_path: string | null;
  } | null;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
}

export interface StatusChartDataPoint {
  name: string;
  value: number;
  color: string;
}

const DEFAULT_STATS: DashboardStats = {
  totalRevenue: 0,
  last7Days: 0,
  last7DaysGrowth: 0,
  alertsCount: 0,
  queueCount: 0,
  conversionRate: 0,
  totalTransactions: 0,
  avgTicket: 0,
  pendingCount: 0,
};

const DEFAULT_SETTINGS: DashboardSettings = {
  showTicketMedio: false,
  showTaxaConversao: false,
  showPendentes: false,
};

export function useDashboardData(userId: string | undefined) {
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [topAlerts, setTopAlerts] = useState<TopAlert[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [statusChartData, setStatusChartData] = useState<StatusChartDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  // Load streamer data - returns the streamer ID for subsequent queries
  const loadStreamerData = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("streamers")
        .select("id, handle, display_name, public_key")
        .eq("auth_user_id", userId)
        .single();

      if (error) throw error;
      setStreamer(data);
      return data.id;
    } catch (error) {
      console.error("Error loading streamer:", error);
      toast.error("Erro ao carregar dados do streamer");
      return null;
    }
  }, [userId]);

  // Load dashboard settings
  const loadDashboardSettings = useCallback(async (streamerId: string) => {
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("show_ticket_medio, show_taxa_conversao, show_pendentes")
        .eq("streamer_id", streamerId)
        .single();

      if (settings) {
        setDashboardSettings({
          showTicketMedio: settings.show_ticket_medio ?? false,
          showTaxaConversao: settings.show_taxa_conversao ?? false,
          showPendentes: settings.show_pendentes ?? false,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard settings:", error);
    }
  }, []);

  // Load stats with limits for performance
  const loadStats = useCallback(async (streamerId: string) => {
    try {
      // Fetch transactions with limit for performance (recent 1000)
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, status, created_at, alerts!inner(test_mode)")
        .eq("streamer_id", streamerId)
        .eq("alerts.test_mode", false)
        .order("created_at", { ascending: false })
        .limit(1000);

      const paidTransactions = allTransactions?.filter(t => t.status === "paid") || [];
      const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount_streamer_cents, 0);

      // Last 7 days and previous 7 days for growth comparison
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(today.getDate() - 14);

      const thisWeekRevenue = paidTransactions
        .filter(t => new Date(t.created_at) >= sevenDaysAgo)
        .reduce((sum, t) => sum + t.amount_streamer_cents, 0);

      const lastWeekRevenue = paidTransactions
        .filter(t => new Date(t.created_at) >= fourteenDaysAgo && new Date(t.created_at) < sevenDaysAgo)
        .reduce((sum, t) => sum + t.amount_streamer_cents, 0);

      const growthPercent = lastWeekRevenue > 0 
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : thisWeekRevenue > 0 ? 100 : 0;

      // Conversion rate
      const totalTx = allTransactions?.length || 0;
      const paidTx = paidTransactions.length;
      const conversionRate = totalTx > 0 ? (paidTx / totalTx) * 100 : 0;
      
      // Average ticket
      const avgTicket = paidTx > 0 ? (totalRevenue / 100) / paidTx : 0;
      
      // Pending transactions
      const pendingCount = allTransactions?.filter(t => t.status === "pending").length || 0;

      // Status chart data
      const pending = pendingCount;
      const paid = paidTx;
      const failed = allTransactions?.filter(t => t.status === "failed").length || 0;

      setStatusChartData([
        { name: "Pago", value: paid, color: "hsl(var(--primary))" },
        { name: "Pendente", value: pending, color: "hsl(var(--secondary))" },
        { name: "Falhou", value: failed, color: "hsl(var(--destructive))" },
      ].filter(item => item.value > 0));

      // Alerts and queue counts (use count for efficiency)
      const [alertsResult, queueResult] = await Promise.all([
        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("streamer_id", streamerId)
          .eq("status", "published"),
        supabase
          .from("alert_queue")
          .select("*", { count: "exact", head: true })
          .eq("streamer_id", streamerId)
          .eq("status", "queued"),
      ]);

      setStats({
        totalRevenue: totalRevenue / 100,
        last7Days: thisWeekRevenue / 100,
        last7DaysGrowth: growthPercent,
        alertsCount: alertsResult.count || 0,
        queueCount: queueResult.count || 0,
        conversionRate,
        totalTransactions: paidTx,
        avgTicket,
        pendingCount,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  // Load top alerts with limit
  const loadTopAlerts = useCallback(async (streamerId: string) => {
    try {
      const { data } = await supabase
        .from("alerts")
        .select(`
          id,
          title,
          thumb_path,
          price_cents,
          test_mode,
          transactions!inner (
            amount_streamer_cents,
            status
          )
        `)
        .eq("streamer_id", streamerId)
        .eq("test_mode", false)
        .eq("transactions.status", "paid")
        .limit(100); // Limit for performance

      // Group by alert and calculate totals
      const alertsMap = new Map<string, TopAlert>();
      data?.forEach((alert) => {
        if (!alertsMap.has(alert.id)) {
          alertsMap.set(alert.id, {
            id: alert.id,
            title: alert.title,
            thumb_path: alert.thumb_path,
            price_cents: alert.price_cents,
            sales_count: 0,
            total_revenue: 0,
          });
        }
        const existing = alertsMap.get(alert.id)!;
        const txArray = alert.transactions as Array<{ amount_streamer_cents: number }>;
        if (Array.isArray(txArray)) {
          txArray.forEach((tx) => {
            existing.sales_count += 1;
            existing.total_revenue += tx.amount_streamer_cents || 0;
          });
        }
      });

      const topAlertsData = Array.from(alertsMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      setTopAlerts(topAlertsData);
    } catch (error) {
      console.error("Error loading top alerts:", error);
    }
  }, []);

  // Load queue items
  const loadQueueItems = useCallback(async (streamerId: string) => {
    try {
      const { data } = await supabase
        .from("alert_queue")
        .select(`
          id,
          status,
          enqueued_at,
          started_at,
          finished_at,
          alerts (
            title,
            thumb_path
          )
        `)
        .eq("streamer_id", streamerId)
        .in("status", ["queued", "playing"])
        .order("enqueued_at", { ascending: true })
        .limit(5);

      setQueueItems(data || []);
    } catch (error) {
      console.error("Error loading queue items:", error);
    }
  }, []);

  // Load chart data
  const loadChartData = useCallback(async (streamerId: string, period: "7d" | "30d" | "90d") => {
    try {
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[period];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, created_at, alerts!inner(test_mode)")
        .eq("streamer_id", streamerId)
        .eq("status", "paid")
        .eq("alerts.test_mode", false)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(500); // Limit for performance

      if (!transactions) {
        setChartData([]);
        return;
      }

      // Group by appropriate unit
      const grouped = transactions.reduce((acc: Record<string, number>, t) => {
        let dateKey: string;
        if (period === "7d" || period === "30d") {
          dateKey = new Date(t.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });
        } else {
          // For 90d, group by week
          const date = new Date(t.created_at);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          dateKey = weekStart.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          });
        }
        if (!acc[dateKey]) acc[dateKey] = 0;
        acc[dateKey] += t.amount_streamer_cents / 100;
        return acc;
      }, {});

      const data: ChartDataPoint[] = Object.entries(grouped).map(([date, value]) => ({
        date,
        revenue: value,
      }));

      setChartData(data);
    } catch (error) {
      console.error("Error loading chart data:", error);
    }
  }, []);

  // Main data loading function - loads streamer once, then all other data in parallel
  const loadAllData = useCallback(async () => {
    setLoading(true);
    
    const streamerId = await loadStreamerData();
    if (!streamerId) {
      setLoading(false);
      return;
    }

    // Load all data in parallel
    await Promise.all([
      loadStats(streamerId),
      loadTopAlerts(streamerId),
      loadQueueItems(streamerId),
      loadDashboardSettings(streamerId),
      loadChartData(streamerId, chartPeriod),
    ]);

    setLoading(false);
  }, [loadStreamerData, loadStats, loadTopAlerts, loadQueueItems, loadDashboardSettings, loadChartData, chartPeriod]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadAllData();
    }
  }, [userId, loadAllData]);

  // Reload chart data when period changes
  useEffect(() => {
    if (streamer?.id) {
      loadChartData(streamer.id, chartPeriod);
    }
  }, [chartPeriod, streamer?.id, loadChartData]);

  return {
    streamer,
    stats,
    dashboardSettings,
    topAlerts,
    queueItems,
    chartData,
    statusChartData,
    chartPeriod,
    setChartPeriod,
    loading,
    refresh: loadAllData,
  };
}
