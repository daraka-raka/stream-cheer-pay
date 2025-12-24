import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNotifications } from "@/hooks/use-notifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Clock, DollarSign, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "payment":
      return <DollarSign className="h-5 w-5 text-green-600" />;
    case "alert":
      return <Bell className="h-5 w-5 text-blue-600" />;
    case "system":
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.read : true
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe todas as atualizações da sua conta
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              Todas
              <Badge variant="secondary">{notifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              Não lidas
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3 mt-6">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">
                    {filter === "unread"
                      ? "Nenhuma notificação não lida"
                      : "Nenhuma notificação"}
                  </h3>
                  <p className="text-muted-foreground">
                    {filter === "unread"
                      ? "Você está em dia! 🎉"
                      : "Você receberá notificações sobre pagamentos, alertas e atualizações do sistema."}
                  </p>
                </div>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-all hover:shadow-md cursor-pointer ${
                    !notification.read ? "border-l-4 border-l-primary bg-muted/30" : ""
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      if (notification.link.startsWith('/')) {
                        navigate(notification.link);
                      } else {
                        window.open(notification.link, '_blank');
                      }
                    }
                  }}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs">
                              Novo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <Button
                          variant="link"
                          className="h-auto p-0 mt-2 text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.link!.startsWith('/')) {
                              navigate(notification.link!);
                            } else {
                              window.open(notification.link!, '_blank');
                            }
                          }}
                        >
                          Ver detalhes →
                        </Button>
                      )}
                    </div>
                    {!notification.read && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
