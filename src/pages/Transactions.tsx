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
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, [user]);

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

      // Calculate available balance
      const paidTransactions = txData?.filter((tx) => tx.status === "paid") || [];
      const totalEarned = paidTransactions.reduce(
        (sum, tx) => sum + tx.amount_streamer_cents,
        0
      );

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

  const stats = [
    {
      title: "Total Arrecadado",
      value: `R$ ${(
        transactions
          .filter((tx) => tx.status === "paid")
          .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0) / 100
      ).toFixed(2)}`,
      icon: DollarSign,
      change: "+0%",
    },
    {
      title: "Últimos 7 dias",
      value: `R$ ${(
        transactions
          .filter((tx) => {
            const txDate = new Date(tx.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return tx.status === "paid" && txDate >= sevenDaysAgo;
          })
          .reduce((sum, tx) => sum + tx.amount_streamer_cents, 0) / 100
      ).toFixed(2)}`,
      icon: TrendingUp,
      change: "+0%",
    },
    {
      title: "Saldo Disponível",
      value: `R$ ${(availableBalance / 100).toFixed(2)}`,
      icon: Wallet,
      change: "para saque",
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
            <Card key={stat.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhuma transação encontrada
                </p>
              </div>
            ) : (
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
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{tx.alerts?.title || "—"}</TableCell>
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
