import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, Wallet, Download, Search, Filter, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [previousWeekBalance, setPreviousWeekBalance] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, statusFilter, alertFilter, searchQuery, dateFrom, dateTo]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get streamer
      const { data: streamer } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!streamer) return;
      setStreamerId(streamer.id);

      // Get transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select(`
          *,
          alerts (
            title
          )
        `)
        .eq("streamer_id", streamer.id)
        .order("created_at", { ascending: false });

      setTransactions(txData || []);

      // Get all alerts for filter
      const { data: alertsData } = await supabase
        .from("alerts")
        .select("id, title")
        .eq("streamer_id", streamer.id)
        .eq("status", "published");
      
      setAlerts(alertsData || []);

      // Calculate available balance
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(today.getDate() - 14);

      const paidTransactions = txData?.filter((tx) => tx.status === "paid") || [];
      const totalEarned = paidTransactions.reduce(
        (sum, tx) => sum + tx.amount_streamer_cents,
        0
      );

      const thisWeekEarned = paidTransactions
        .filter(tx => new Date(tx.created_at) >= sevenDaysAgo)
        .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0);

      const lastWeekEarned = paidTransactions
        .filter(tx => new Date(tx.created_at) >= fourteenDaysAgo && new Date(tx.created_at) < sevenDaysAgo)
        .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0);

      // Get withdrawn amount
      const { data: withdrawals } = await supabase
        .from("withdrawals")
        .select("amount_cents")
        .eq("streamer_id", streamer.id)
        .in("status", ["pending", "processing", "completed"]);

      const totalWithdrawn = withdrawals?.reduce(
        (sum, w) => sum + w.amount_cents,
        0
      ) || 0;

      setAvailableBalance(totalEarned - totalWithdrawn);
      setPreviousWeekBalance(lastWeekEarned);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = () => {
    let filtered = [...transactions];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Alert filter
    if (alertFilter !== "all") {
      filtered = filtered.filter(tx => tx.alert_id === alertFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(tx => 
        tx.buyer_note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.alerts?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(tx => new Date(tx.created_at) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.created_at) <= endOfDay);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const exportToCSV = () => {
    const csv = [
      ['Data', 'Alerta', 'Valor Total', 'Taxa Stripe', 'Taxa Streala', 'Líquido', 'Status', 'Nota'],
      ...filteredTransactions.map(tx => [
        new Date(tx.created_at).toLocaleDateString("pt-BR"),
        tx.alerts?.title || "—",
        (tx.amount_cents / 100).toFixed(2),
        (tx.fee_stripe_cents / 100).toFixed(2),
        (tx.fee_streala_cents / 100).toFixed(2),
        (tx.amount_streamer_cents / 100).toFixed(2),
        tx.status,
        tx.buyer_note || "—"
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado com sucesso!" });
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const thisWeekRevenue = transactions
    .filter((tx) => {
      const txDate = new Date(tx.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return tx.status === "paid" && txDate >= sevenDaysAgo;
    })
    .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0);

  const growthPercent = previousWeekBalance > 0 
    ? ((thisWeekRevenue - previousWeekBalance) / previousWeekBalance) * 100 
    : thisWeekRevenue > 0 ? 100 : 0;

  const stats = [
    {
      title: "Total Arrecadado",
      value: `R$ ${(
        transactions
          .filter((tx) => tx.status === "paid")
          .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0) / 100
      ).toFixed(2)}`,
      icon: DollarSign,
      changeIcon: null,
    },
    {
      title: "Últimos 7 dias",
      value: `R$ ${(thisWeekRevenue / 100).toFixed(2)}`,
      icon: TrendingUp,
      change: `${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}%`,
      changeIcon: growthPercent >= 0 ? ArrowUpRight : ArrowDownRight,
      changeColor: growthPercent >= 0 ? "text-green-500" : "text-red-500",
    },
    {
      title: "Saldo Disponível",
      value: `R$ ${(availableBalance / 100).toFixed(2)}`,
      icon: Wallet,
      change: "para saque",
      changeIcon: null,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Histórico de vendas e arrecadação
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="p-4 sm:p-6 border-border shadow-card hover:shadow-glow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.changeIcon && <stat.changeIcon className={cn("h-3 w-3", stat.changeColor)} />}
                    <p className={cn("text-xs", stat.changeColor || "text-muted-foreground")}>
                      {stat.change}
                    </p>
                  </div>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border shadow-card p-4 sm:p-6">
          <div className="space-y-4">
            {/* Search - Full width */}
            <div>
              <Label className="text-sm mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nota ou título..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Status and Alert filters - Grid on mobile */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Alerta</Label>
                <Select value={alertFilter} onValueChange={setAlertFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {alerts.map((alert) => (
                      <SelectItem key={alert.id} value={alert.id}>
                        {alert.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date filters - Grid on mobile */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm mb-2 block">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                      <Calendar className="mr-1 sm:mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{dateFrom ? format(dateFrom, "dd/MM/yy") : "Selecione"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                      <Calendar className="mr-1 sm:mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{dateTo ? format(dateTo, "dd/MM/yy") : "Selecione"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStatusFilter("all");
                  setAlertFilter("all");
                  setSearchQuery("");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
              <Button 
                onClick={exportToCSV} 
                disabled={filteredTransactions.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-border shadow-card">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Histórico</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? "transação" : "transações"}
              </p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma transação encontrada
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: Card view */}
                <div className="space-y-3 md:hidden">
                  {paginatedTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tx.alerts?.title || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                            tx.status === "paid"
                              ? "bg-green-500/10 text-green-500"
                              : tx.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {tx.status === "paid" ? "Pago" : tx.status === "pending" ? "Pendente" : "Falhou"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          <span>Total: R$ {(tx.amount_cents / 100).toFixed(2)}</span>
                        </div>
                        <p className="text-base font-bold text-primary">
                          R$ {(tx.amount_streamer_cents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table view */}
                <div className="overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Alerta</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">Taxa Stripe</TableHead>
                        <TableHead className="text-right">Taxa Streala</TableHead>
                        <TableHead className="text-right">Valor Líquido</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.alerts?.title || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(tx.amount_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(tx.fee_stripe_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(tx.fee_streala_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {(tx.amount_streamer_cents / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                tx.status === "paid"
                                  ? "bg-green-500/10 text-green-500"
                                  : tx.status === "pending"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {tx.status === "paid" ? "Pago" : tx.status === "pending" ? "Pendente" : "Falhou"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                    <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
