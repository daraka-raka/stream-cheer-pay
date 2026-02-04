import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const Dashboard = () => {
  const { user } = useAuth();
  const {
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
  } = useDashboardData(user?.id);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Bem-vindo, {streamer?.display_name}!</h1>
            <p className="text-muted-foreground">Acompanhe seu desempenho e gerencie seus alertas.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Arrecadação Total</CardTitle>
                <DollarSign className="h-4 w-4 text-primary hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">
                  R$ {loading ? "..." : stats.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {stats.totalTransactions} vendas
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Últimos 7 Dias</CardTitle>
                {stats.last7DaysGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-primary hidden sm:block" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive hidden sm:block" />
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">
                  R$ {loading ? "..." : stats.last7Days.toFixed(2)}
                </div>
                {!loading && (
                  <p className={`text-xs mt-1 hidden sm:block ${stats.last7DaysGrowth >= 0 ? "text-primary" : "text-destructive"}`}>
                    {stats.last7DaysGrowth >= 0 ? "+" : ""}{stats.last7DaysGrowth.toFixed(1)}% vs semana anterior
                  </p>
                )}
              </CardContent>
            </Card>

            {dashboardSettings.showTicketMedio && (
              <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio</CardTitle>
                  <Receipt className="h-4 w-4 text-accent hidden sm:block" />
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-lg sm:text-2xl font-bold">
                    R$ {loading ? "..." : stats.avgTicket.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    Por transação
                  </p>
                </CardContent>
              </Card>
            )}

            {dashboardSettings.showTaxaConversao && (
              <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Taxa de Conversão</CardTitle>
                  <Target className="h-4 w-4 text-accent hidden sm:block" />
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-lg sm:text-2xl font-bold">
                    {loading ? "..." : `${stats.conversionRate.toFixed(1)}%`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    Transações pagas / total
                  </p>
                </CardContent>
              </Card>
            )}

            {dashboardSettings.showPendentes && (
              <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-secondary hidden sm:block" />
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-lg sm:text-2xl font-bold">{loading ? "..." : stats.pendingCount}</div>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    Aguardando pagamento
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-border shadow-card hover:shadow-glow transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Fila Atual</CardTitle>
                <Zap className="h-4 w-4 text-primary hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{loading ? "..." : stats.queueCount}</div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
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
                  <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as "7d" | "30d" | "90d")}>
                    <TabsList>
                      <TabsTrigger value="7d">7d</TabsTrigger>
                      <TabsTrigger value="30d">30d</TabsTrigger>
                      <TabsTrigger value="90d">90d</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] overflow-hidden">
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Receita",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="w-full h-full overflow-hidden"
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

          {/* Quick Actions */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
