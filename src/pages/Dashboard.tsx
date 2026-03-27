import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Zap, DollarSign, ArrowUpRight, ArrowDownRight, Target, Clock, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TopAlerts } from "@/components/TopAlerts";
import { QueuePreview } from "@/components/QueuePreview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const METRIC_COLORS = {
  revenue: '#a78bfa',
  sales: '#22c55e',
  queue: '#fb923c',
  conversion: '#a78bfa',
  pending: '#fb923c',
  ticket: '#22c55e',
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  loading: boolean;
  subtitleColor?: string;
}

const MetricCard = ({ title, value, subtitle, color, loading, subtitleColor }: MetricCardProps) => (
  <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color }} />
    <p className="font-body font-light text-xs text-[rgba(221,217,208,0.22)] mb-2">{title}</p>
    <p className="font-display font-bold text-2xl sm:text-[28px] text-foreground">
      {loading ? "..." : value}
    </p>
    {subtitle && (
      <p className={`font-body text-xs mt-1 ${subtitleColor || 'text-muted-foreground'}`}>{subtitle}</p>
    )}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const {
    streamer, stats, dashboardSettings, topAlerts, queueItems,
    chartData, statusChartData, chartPeriod, setChartPeriod, loading,
  } = useDashboardData(user?.id);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8 overflow-x-hidden">
          {/* Welcome */}
          <div>
            <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">Bem-vindo, {streamer?.display_name}!</h1>
            <p className="font-body font-light text-muted-foreground text-sm">Acompanhe seu desempenho e gerencie seus alertas.</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            <MetricCard
              title="Arrecadação Total"
              value={`R$ ${stats.totalRevenue.toFixed(2)}`}
              subtitle={`${stats.totalTransactions} vendas`}
              color={METRIC_COLORS.revenue}
              loading={loading}
            />
            <MetricCard
              title="Últimos 7 Dias"
              value={`R$ ${stats.last7Days.toFixed(2)}`}
              subtitle={!loading ? `${stats.last7DaysGrowth >= 0 ? "+" : ""}${stats.last7DaysGrowth.toFixed(1)}% vs semana anterior` : undefined}
              subtitleColor={stats.last7DaysGrowth >= 0 ? "text-green-400" : "text-red-400"}
              color={METRIC_COLORS.sales}
              loading={loading}
            />
            {dashboardSettings.showTicketMedio && (
              <MetricCard title="Ticket Médio" value={`R$ ${stats.avgTicket.toFixed(2)}`} subtitle="Por transação" color={METRIC_COLORS.ticket} loading={loading} />
            )}
            {dashboardSettings.showTaxaConversao && (
              <MetricCard title="Taxa de Conversão" value={`${stats.conversionRate.toFixed(1)}%`} subtitle="Transações pagas / total" color={METRIC_COLORS.conversion} loading={loading} />
            )}
            {dashboardSettings.showPendentes && (
              <MetricCard title="Pendentes" value={`${stats.pendingCount}`} subtitle="Aguardando pagamento" color={METRIC_COLORS.pending} loading={loading} />
            )}
            <MetricCard title="Fila Atual" value={`${stats.queueCount}`} subtitle={`${stats.alertsCount} alertas publicados`} color={METRIC_COLORS.queue} loading={loading} />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg">Receita no Período</h3>
                  <p className="font-body text-xs text-muted-foreground">Evolução da sua arrecadação</p>
                </div>
                <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as "7d" | "30d" | "90d")}>
                  <TabsList><TabsTrigger value="7d" className="font-body text-xs">7d</TabsTrigger><TabsTrigger value="30d" className="font-body text-xs">30d</TabsTrigger><TabsTrigger value="90d" className="font-body text-xs">90d</TabsTrigger></TabsList>
                </Tabs>
              </div>
              <div className="h-[220px] sm:h-[280px] overflow-hidden">
                <ChartContainer config={{ revenue: { label: "Receita", color: "#a78bfa" } }} className="w-full h-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "rgba(221,217,208,0.22)", fontSize: 11, fontFamily: "DM Sans" }} />
                      <YAxis className="text-xs" tick={{ fill: "rgba(221,217,208,0.22)", fontSize: 11, fontFamily: "DM Sans" }} tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Receita"]} />} />
                      <Line type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
              <h3 className="font-display font-bold mb-1">Status das Transações</h3>
              <p className="font-body text-xs text-muted-foreground mb-4">Distribuição por status</p>
              <div className="h-[220px] sm:h-[240px] flex items-center justify-center">
                {statusChartData.length === 0 ? (
                  <p className="text-muted-foreground text-sm font-body">Nenhuma transação ainda</p>
                ) : (
                  <ChartContainer config={{ paid: { label: "Pago", color: "#a78bfa" }, pending: { label: "Pendente", color: "#fb923c" }, failed: { label: "Falhou", color: "#ef4444" } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#a78bfa" dataKey="value">
                          {statusChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Alerts and Queue */}
          <div className="grid lg:grid-cols-2 gap-6">
            <TopAlerts alerts={topAlerts} loading={loading} />
            <QueuePreview queue={queueItems} loading={loading} />
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
            <h3 className="font-display font-bold mb-4">Ações Rápidas</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/alerts"><Button className="font-body"><Zap className="mr-2 h-4 w-4" />Criar Alerta</Button></Link>
              <Link to="/settings"><Button variant="outline" className="font-body">Configurações</Button></Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
