import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TopAlert {
  id: string;
  title: string;
  thumb_path: string | null;
  price_cents: number;
  sales_count: number;
  total_revenue: number;
}

interface TopAlertsProps {
  alerts: TopAlert[];
  loading: boolean;
}

export const TopAlerts = ({ alerts, loading }: TopAlertsProps) => {
  const navigate = useNavigate();

  const handleAlertClick = (alertId: string) => {
    navigate('/alerts', { state: { highlightAlertId: alertId } });
  };

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
      <h3 className="font-display font-bold flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        Top 5 Alertas Mais Vendidos
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8 font-body">Nenhuma venda ainda</p>
      ) : (
        <div className="space-y-1">
          {alerts.map((alert, index) => (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.id)}
              className="cursor-pointer flex items-center gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors border-b border-[rgba(255,255,255,0.05)] last:border-b-0"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(167,139,250,0.08)] flex items-center justify-center text-primary font-display font-bold text-sm">
                {index + 1}
              </div>
              {alert.thumb_path && (
                <img src={alert.thumb_path} alt={alert.title} loading="lazy" className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-body font-medium text-sm truncate">{alert.title}</p>
                <p className="font-body text-xs text-muted-foreground">{alert.sales_count} {alert.sales_count === 1 ? "venda" : "vendas"}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-primary text-sm">R$ {(alert.total_revenue / 100).toFixed(2)}</p>
                <p className="font-body text-[10px] text-muted-foreground">R$ {(alert.price_cents / 100).toFixed(2)} cada</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
