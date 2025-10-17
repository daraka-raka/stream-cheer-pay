import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Implementar queries Supabase

  const stats = [
    {
      title: "Total Arrecadado",
      value: "R$ 0,00",
      icon: DollarSign,
      change: "+0%",
    },
    {
      title: "Últimos 7 dias",
      value: "R$ 0,00",
      icon: TrendingUp,
      change: "+0%",
    },
    {
      title: "Valor Líquido",
      value: "R$ 0,00",
      icon: Wallet,
      change: "após taxas",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de vendas e arrecadação
          </p>
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
                      <TableCell>{tx.alert?.title || "—"}</TableCell>
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
      </div>
    </DashboardLayout>
  );
}
