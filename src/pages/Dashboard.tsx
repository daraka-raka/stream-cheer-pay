import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Zap, DollarSign, TrendingUp, Copy, ExternalLink, TrendingDown, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TopAlerts } from "@/components/TopAlerts";
import { QueuePreview } from "@/components/QueuePreview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Streamer {
  id: string;
  handle: string;
  display_name: string;
  public_key: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    last7Days: 0,
    last7DaysGrowth: 0,
    alertsCount: 0,
    queueCount: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [topAlerts, setTopAlerts] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [statusChartData, setStatusChartData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadStreamerData();
      loadStats();
      loadTopAlerts();
      loadQueueItems();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadChartData();
    }
  }, [user, chartPeriod]);

  const loadStreamerData = async () => {
    try {
      const { data, error } = await supabase
        .from("streamers")
        .select("*")
        .eq("auth_user_id", user?.id)
        .single();

      if (error) throw error;
      setStreamer(data);
    } catch (error) {
      console.error("Error loading streamer:", error);
      toast.error("Erro ao carregar dados do streamer");
    }
  };

  const loadStats = async () => {
    try {
      const { data: streamerData } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!streamerData) return;

      // Total revenue
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, status")
        .eq("streamer_id", streamerData.id);

      const totalRevenue = allTransactions?.filter(t => t.status === "paid").reduce((sum, t) => sum + t.amount_streamer_cents, 0) || 0;

      // Last 7 days and previous 7 days for growth comparison
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(today.getDate() - 14);

      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, created_at")
        .eq("streamer_id", streamerData.id)
        .eq("status", "paid")
        .gte("created_at", fourteenDaysAgo.toISOString());

      const thisWeekRevenue = recentTransactions
        ?.filter(t => new Date(t.created_at) >= sevenDaysAgo)
        .reduce((sum, t) => sum + t.amount_streamer_cents, 0) || 0;

      const lastWeekRevenue = recentTransactions
        ?.filter(t => new Date(t.created_at) >= fourteenDaysAgo && new Date(t.created_at) < sevenDaysAgo)
        .reduce((sum, t) => sum + t.amount_streamer_cents, 0) || 0;

      const growthPercent = lastWeekRevenue > 0 
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : thisWeekRevenue > 0 ? 100 : 0;

      // Conversion rate
      const totalTx = allTransactions?.length || 0;
      const paidTx = allTransactions?.filter(t => t.status === "paid").length || 0;
      const conversionRate = totalTx > 0 ? (paidTx / totalTx) * 100 : 0;

      // Status chart data
      const pending = allTransactions?.filter(t => t.status === "pending").length || 0;
      const paid = paidTx;
      const failed = allTransactions?.filter(t => t.status === "failed").length || 0;

      setStatusChartData([
        { name: "Pago", value: paid, color: "hsl(var(--primary))" },
        { name: "Pendente", value: pending, color: "hsl(var(--secondary))" },
        { name: "Falhou", value: failed, color: "hsl(var(--destructive))" },
      ].filter(item => item.value > 0));

      // Alerts count
      const { count: alertsCount } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("streamer_id", streamerData.id)
        .eq("status", "published");

      // Queue count
      const { count: queueCount } = await supabase
        .from("alert_queue")
        .select("*", { count: "exact", head: true })
        .eq("streamer_id", streamerData.id)
        .eq("status", "queued");

      setStats({
        totalRevenue: totalRevenue / 100,
        last7Days: thisWeekRevenue / 100,
        last7DaysGrowth: growthPercent,
        alertsCount: alertsCount || 0,
        queueCount: queueCount || 0,
        conversionRate,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopAlerts = async () => {
    try {
      const { data: streamerData } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!streamerData) return;

      const { data } = await supabase
        .from("alerts")
        .select(`
          id,
          title,
          thumb_path,
          price_cents,
          transactions!inner (
            amount_streamer_cents,
            status
          )
        `)
        .eq("streamer_id", streamerData.id)
        .eq("transactions.status", "paid");

      // Group by alert and calculate totals
      const alertsMap = new Map();
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
        const existing = alertsMap.get(alert.id);
        existing.sales_count += 1;
        existing.total_revenue += (alert.transactions as any).amount_streamer_cents;
      });

      const topAlertsData = Array.from(alertsMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      setTopAlerts(topAlertsData);
    } catch (error) {
      console.error("Error loading top alerts:", error);
    }
  };

  const loadQueueItems = async () => {
    try {
      const { data: streamerData } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!streamerData) return;

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
        .eq("streamer_id", streamerData.id)
        .in("status", ["queued", "playing"])
        .order("enqueued_at", { ascending: true })
        .limit(5);

      setQueueItems(data || []);
    } catch (error) {
      console.error("Error loading queue items:", error);
    }
  };

  const loadChartData = async () => {
    try {
      const { data: streamerData } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!streamerData) return;

      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[chartPeriod];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, created_at")
        .eq("streamer_id", streamerData.id)
        .eq("status", "paid")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (!transactions) return;

      // Group by appropriate unit
      const grouped = transactions.reduce((acc: any, t) => {
        let dateKey: string;
        if (chartPeriod === "7d" || chartPeriod === "30d") {
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

      const data = Object.entries(grouped).map(([date, value]) => ({
        date,
        revenue: value,
      }));

      setChartData(data);
    } catch (error) {
      console.error("Error loading chart data:", error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const widgetUrl = `${window.location.origin}/overlay.html?key=${streamer?.public_key}`;
  const publicUrl = `${window.location.origin}/${streamer?.handle}`;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Bem-vindo, {streamer?.display_name}!</h1>
            <p className="text-muted-foreground">Acompanhe seu desempenho e gerencie seus alertas.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Arrecadação Total</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {loading ? "..." : stats.totalRevenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Últimos 7 Dias</CardTitle>
                {stats.last7DaysGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {loading ? "..." : stats.last7Days.toFixed(2)}
                </div>
                {!loading && (
                  <p className={`text-xs mt-1 ${stats.last7DaysGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {stats.last7DaysGrowth >= 0 ? "+" : ""}{stats.last7DaysGrowth.toFixed(1)}% vs semana anterior
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : `${stats.conversionRate.toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Transações pagas / total
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fila Atual</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stats.queueCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.alertsCount} alertas publicados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-border shadow-card lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Receita no Período</CardTitle>
                    <CardDescription>Evolução da sua arrecadação</CardDescription>
                  </div>
                  <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                    <TabsList>
                      <TabsTrigger value="7d">7d</TabsTrigger>
                      <TabsTrigger value="30d">30d</TabsTrigger>
                      <TabsTrigger value="90d">90d</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Receita",
                      color: "hsl(var(--primary))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Receita"]}
                        />} 
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Status das Transações</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {statusChartData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma transação ainda</p>
                ) : (
                  <ChartContainer
                    config={{
                      paid: { label: "Pago", color: "hsl(var(--primary))" },
                      pending: { label: "Pendente", color: "hsl(var(--secondary))" },
                      failed: { label: "Falhou", color: "hsl(var(--destructive))" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Alerts and Queue */}
          <div className="grid lg:grid-cols-2 gap-6">
            <TopAlerts alerts={topAlerts} loading={loading} />
            <QueuePreview queue={queueItems} loading={loading} />
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Widget URL (OBS)</CardTitle>
                <CardDescription>
                  Use esta URL como Browser Source no OBS ou software de streaming
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={widgetUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(widgetUrl, "Widget URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(widgetUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Página Pública</CardTitle>
                <CardDescription>
                  Compartilhe esta URL com seu público para que possam comprar alertas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(publicUrl, "Página pública")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(publicUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Link to="/alerts">
                <Button variant="hero">
                  <Zap className="mr-2 h-4 w-4" />
                  Criar Alerta
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline">Configurações</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
