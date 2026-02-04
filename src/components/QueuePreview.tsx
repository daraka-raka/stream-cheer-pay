import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, CheckCircle2 } from "lucide-react";

interface QueueItem {
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

interface QueuePreviewProps {
  queue: QueueItem[];
  loading: boolean;
}

export const QueuePreview = ({ queue, loading }: QueuePreviewProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "playing":
        return <Play className="h-4 w-4 text-primary" />;
      case "finished":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "queued":
        return "Na fila";
      case "playing":
        return "Tocando";
      case "finished":
        return "Concluído";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Próximos na Fila</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Próximos na Fila</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum alerta na fila
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader>
        <CardTitle>Próximos na Fila</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              {getStatusIcon(item.status)}
              {item.alerts?.thumb_path && (
                <img
                  src={item.alerts.thumb_path}
                  alt={item.alerts.title || "Alert"}
                  loading="lazy"
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.alerts?.title || "Sem título"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.enqueued_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {getStatusLabel(item.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
