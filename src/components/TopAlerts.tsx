import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (loading) {
    return (
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top 5 Alertas Mais Vendidos
          </CardTitle>
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

  if (alerts.length === 0) {
    return (
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top 5 Alertas Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhuma venda ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top 5 Alertas Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div 
              key={alert.id} 
              onClick={() => handleAlertClick(alert.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {index + 1}
                </div>
                {alert.thumb_path && (
                  <img
                    src={alert.thumb_path}
                    alt={alert.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.sales_count} {alert.sales_count === 1 ? "venda" : "vendas"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    R$ {(alert.total_revenue / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(alert.price_cents / 100).toFixed(2)} cada
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
