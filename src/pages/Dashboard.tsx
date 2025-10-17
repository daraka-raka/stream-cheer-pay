import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Zap, DollarSign, TrendingUp, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
    alertsCount: 0,
    queueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadStreamerData();
      loadStats();
      loadChartData();
    }
  }, [user]);

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
      // Get streamer ID first
      const { data: streamerData } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (!streamerData) return;

      // Total revenue
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents")
        .eq("streamer_id", streamerData.id)
        .eq("status", "paid");

      const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount_streamer_cents, 0) || 0;

      // Last 7 days revenue
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents")
        .eq("streamer_id", streamerData.id)
        .eq("status", "paid")
        .gte("created_at", sevenDaysAgo.toISOString());

      const last7Days = recentTransactions?.reduce((sum, t) => sum + t.amount_streamer_cents, 0) || 0;

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
        last7Days: last7Days / 100,
        alertsCount: alertsCount || 0,
        queueCount: queueCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount_streamer_cents, created_at")
        .eq("streamer_id", streamerData.id)
        .eq("status", "paid")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (!transactions) return;

      // Agrupar por dia
      const grouped = transactions.reduce((acc: any, t) => {
        const date = new Date(t.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
        if (!acc[date]) acc[date] = 0;
        acc[date] += t.amount_streamer_cents / 100;
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

  const widgetUrl = `${window.location.origin}/widget/${streamer?.public_key}`;
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
          <div className="grid md:grid-cols-4 gap-6">
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
                <TrendingUp className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {loading ? "..." : stats.last7Days.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Alertas Publicados</CardTitle>
                <Zap className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stats.alertsCount}</div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fila Atual</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stats.queueCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Receita dos Últimos 30 Dias</CardTitle>
              <CardDescription>Evolução diária da sua arrecadação</CardDescription>
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
                    <ChartTooltip content={<ChartTooltipContent />} />
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
