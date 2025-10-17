import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Implementar queries Supabase

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus alertas de mídia (máximo 20)
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Novo Alerta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loading
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </Card>
            ))
          ) : alerts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                Você ainda não criou nenhum alerta
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted relative">
                  {alert.thumb_path && (
                    <img
                      src={alert.thumb_path}
                      alt={alert.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      R$ {(alert.price_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {alert.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1">
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="h-3 w-3" />
                      Testar
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
