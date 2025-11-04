import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { withdrawalSchema } from "@/lib/validations";
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
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
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

  const handleWithdraw = async () => {
    if (!streamerId) return;

    // Validate with zod schema
    try {
      const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
      
      const validationData = {
        pix_key: pixKey.trim(),
        amount_cents: amountCents
      };
      
      const result = withdrawalSchema.safeParse(validationData);
      if (!result.success) {
        const error = result.error.errors[0];
        toast({
          title: error.message,
          variant: "destructive",
        });
        return;
      }

      if (amountCents < 10000) {
        toast({
          title: "Valor mínimo é R$ 100,00",
          variant: "destructive",
        });
        return;
      }

      if (amountCents > availableBalance) {
        toast({
          title: "Saldo insuficiente",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("withdrawals").insert({
        streamer_id: streamerId,
        amount_cents: amountCents,
        pix_key: pixKey,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Seu saque será processado em até 2 dias úteis.",
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setPixKey("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar saque",
        description: error.message,
        variant: "destructive",
      });
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Transações</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de vendas e arrecadação
            </p>
          </div>
          <Button
            onClick={() => setWithdrawDialogOpen(true)}
            disabled={availableBalance < 10000}
            className="gap-2"
          >
            <Wallet className="h-4 w-4" />
            Solicitar Saque
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="p-6 border-border shadow-card hover:shadow-glow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.changeIcon && <stat.changeIcon className={cn("h-3 w-3", stat.changeColor)} />}
                    <p className={cn("text-xs", stat.changeColor || "text-muted-foreground")}>
                      {stat.change}
                    </p>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border shadow-card p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm mb-2">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nota ou título do alerta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="w-full lg:w-48">
              <Label className="text-sm mb-2">Status</Label>
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

            <div className="w-full lg:w-48">
              <Label className="text-sm mb-2">Alerta</Label>
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

            <div className="w-full lg:w-48">
              <Label className="text-sm mb-2">Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecione"}
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

            <div className="w-full lg:w-48">
              <Label className="text-sm mb-2">Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecione"}
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

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setAlertFilter("all");
                  setSearchQuery("");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button onClick={exportToCSV} disabled={filteredTransactions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-border shadow-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Histórico</h2>
              <p className="text-sm text-muted-foreground">
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
                <div className="overflow-x-auto">
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
                              {tx.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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

        {/* Withdraw Dialog */}
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
              <DialogDescription>
                Saldo disponível: R$ {(availableBalance / 100).toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="amount">Valor do Saque (mín. R$ 100,00)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="100"
                  step="0.01"
                  placeholder="100.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pix">Chave PIX</Label>
                <Input
                  id="pix"
                  placeholder="Digite sua chave PIX"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setWithdrawDialogOpen(false);
                  setWithdrawAmount("");
                  setPixKey("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleWithdraw}>Solicitar Saque</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
