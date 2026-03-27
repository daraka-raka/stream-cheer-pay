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
      case "queued": return <Clock className="h-4 w-4 text-[#fb923c]" />;
      case "playing": return <Play className="h-4 w-4 text-primary" />;
      case "finished": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "queued": return "Na fila";
      case "playing": return "Tocando";
      case "finished": return "Concluído";
      default: return status;
    }
  };

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
      <h3 className="font-display font-bold mb-4">Próximos na Fila</h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8 font-body">Nenhum alerta na fila</p>
      ) : (
        <div className="space-y-1">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              {getStatusIcon(item.status)}
              {item.alerts?.thumb_path && (
                <img src={item.alerts.thumb_path} alt={item.alerts.title || "Alert"} loading="lazy" className="w-10 h-10 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-body font-medium text-sm truncate">{item.alerts?.title || "Sem título"}</p>
                <p className="font-body text-[10px] text-muted-foreground">
                  {new Date(item.enqueued_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="font-body text-xs text-muted-foreground">{getStatusLabel(item.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
