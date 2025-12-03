import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Music, Image as ImageIcon, Video, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const PublicStreamerPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // Remove @ prefix if present
  const cleanHandle = handle?.startsWith('@') ? handle.slice(1) : handle;
  console.debug('[PublicStreamerPage] raw handle:', handle);
  console.debug('[PublicStreamerPage] clean handle:', cleanHandle);
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [buyerMessage, setBuyerMessage] = useState("");
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Handle payment return from Mercado Pago
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({
          title: "Pagamento realizado!",
          description: "Seu alerta foi adicionado à fila do streamer. Obrigado!",
        });
      } else if (paymentStatus === "failure") {
        toast({
          title: "Pagamento não concluído",
          description: "O pagamento foi cancelado ou falhou. Tente novamente.",
          variant: "destructive",
        });
      } else if (paymentStatus === "pending") {
        toast({
          title: "Pagamento pendente",
          description: "Seu pagamento está sendo processado. O alerta será exibido após a confirmação.",
        });
      }
      // Clear the payment param from URL
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: streamer, isLoading: streamerLoading } = useQuery({
    queryKey: ["public-streamer", cleanHandle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_streamer_profiles")
        .select("*")
        .eq("handle", cleanHandle)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Streamer não encontrado");
      return data;
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["public-alerts", streamer?.id],
    queryFn: async () => {
      if (!streamer?.id) return [];
      
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("streamer_id", streamer.id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!streamer?.id,
  });

  const handleAlertClick = (alert: any) => {
    setSelectedAlert(alert);
    setPurchaseModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedAlert || !streamer) return;

    setIsProcessingPayment(true);

    try {
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          streamer_id: streamer.id,
          alert_id: selectedAlert.id,
          amount_cents: selectedAlert.price_cents,
          buyer_note: buyerMessage || null,
          status: "pending",
          currency: "BRL",
        })
        .select()
        .single();

      if (error) throw error;

      setTransactionId(transaction.id);

      // If test mode, show test payment dialog
      if (selectedAlert.test_mode) {
        setPurchaseModalOpen(false);
        setPaymentDialogOpen(true);
        setIsProcessingPayment(false);
        return;
      }

      // For real payments, create Mercado Pago preference
      const { data: preferenceData, error: prefError } = await supabase.functions.invoke(
        "create-preference",
        {
          body: {
            transaction_id: transaction.id,
            alert_title: selectedAlert.title,
            amount_cents: selectedAlert.price_cents,
            streamer_handle: cleanHandle,
          },
        }
      );

      if (prefError) throw prefError;

      if (preferenceData?.error) {
        throw new Error(preferenceData.error);
      }

      // Redirect to Mercado Pago checkout
      if (preferenceData?.init_point) {
        window.location.href = preferenceData.init_point;
      } else {
        throw new Error("Não foi possível criar a preferência de pagamento");
      }
    } catch (error: any) {
      console.error("[PublicStreamerPage] Purchase error:", error);
      toast({
        title: "Erro ao processar compra",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmTestPayment = async () => {
    if (!transactionId || !selectedAlert) return;

    try {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "paid" })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      // Add to alert queue
      const { error: queueError } = await supabase
        .from("alert_queue")
        .insert({
          transaction_id: transactionId,
          alert_id: selectedAlert.id,
          streamer_id: streamer!.id,
          status: "queued",
          is_test: true,
          payload: { buyer_note: buyerMessage },
        });

      if (queueError) throw queueError;

      toast({
        title: "Pagamento de teste confirmado!",
        description: "Seu alerta foi adicionado à fila do streamer.",
      });

      setPaymentDialogOpen(false);
      setBuyerMessage("");
      setTransactionId(null);
      setSelectedAlert(null);
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "audio":
        return <Music className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getMediaPreview = (alert: any) => {
    const mediaUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/alerts/${alert.media_path}`;
    
    if (alert.media_type === "video") {
      return (
        <video
          src={mediaUrl}
          controls
          className="w-full max-h-96 rounded-md"
        />
      );
    } else if (alert.media_type === "audio") {
      const thumbUrl = alert.thumb_path
        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/alerts/${alert.thumb_path}`
        : null;
      
      return (
        <div className="space-y-4">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt="Capa do áudio"
              className="w-full rounded-md object-cover"
            />
          )}
          <audio src={mediaUrl} controls className="w-full" />
        </div>
      );
    } else {
      return (
        <img
          src={mediaUrl}
          alt={alert.title}
          className="w-full rounded-md object-cover"
        />
      );
    }
  };

  if (streamerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Streamer não encontrado</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const initials = streamer.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Streala
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Streamer Profile */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 rounded-lg border bg-card">
          <Avatar className="h-24 w-24">
            <AvatarImage src={streamer.photo_url || undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div>
              <h2 className="text-3xl font-bold">{streamer.display_name}</h2>
              <p className="text-muted-foreground">@{streamer.handle}</p>
            </div>
            {streamer.bio && (
              <p className="text-sm text-muted-foreground max-w-2xl">{streamer.bio}</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                {alerts?.length || 0} Alertas Disponíveis
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts Gallery */}
        {alertsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando alertas...</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {alerts.map((alert) => {
                  const thumbUrl = alert.thumb_path || alert.media_path;

              return (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover:shadow-glow transition-all duration-300 hover:scale-105 relative"
                  onClick={() => handleAlertClick(alert)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={thumbUrl}
                        alt={alert.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2">
                        {getMediaIcon(alert.media_type)}
                        <span className="ml-1 capitalize">{alert.media_type}</span>
                      </Badge>
                      {alert.test_mode && (
                        <Badge variant="outline" className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 border-yellow-600">
                          🧪 Teste
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-2">{alert.title}</CardTitle>
                    {alert.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <div className="w-full flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        R$ {(alert.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhum alerta disponível</h3>
              <p className="text-muted-foreground">
                Este streamer ainda não tem alertas publicados.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprar Alerta</DialogTitle>
            <DialogDescription>
              Este alerta aparecerá na live após a confirmação do pagamento.
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden">
                {getMediaPreview(selectedAlert)}
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">{selectedAlert.title}</h3>
                {selectedAlert.description && (
                  <p className="text-muted-foreground">{selectedAlert.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getMediaIcon(selectedAlert.media_type)}
                  <span className="ml-1 capitalize">{selectedAlert.media_type}</span>
                </Badge>
                <span className="text-3xl font-bold text-primary">
                  R$ {(selectedAlert.price_cents / 100).toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer-message">Mensagem (opcional)</Label>
                <Textarea
                  id="buyer-message"
                  placeholder="Deixe uma mensagem para o streamer (máx. 200 caracteres)"
                  maxLength={200}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {buyerMessage.length}/200
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseModalOpen(false)} disabled={isProcessingPayment}>
              Cancelar
            </Button>
            <Button onClick={handlePurchase} variant="hero" disabled={isProcessingPayment}>
              {isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                `Comprar R$ ${selectedAlert && (selectedAlert.price_cents / 100).toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Test Mode or Stripe Required */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAlert?.test_mode ? "🧪 Pagamento de Teste" : "⚠️ Pagamentos Desabilitados"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAlert?.test_mode 
                ? "Este alerta está em modo de teste. Você pode simular um pagamento sem custos reais. Em produção, esta funcionalidade seria substituída pela integração com Stripe."
                : "A funcionalidade de pagamento está temporariamente desabilitada por questões de segurança. A integração com gateway de pagamento (Stripe) precisa ser configurada antes de aceitar pagamentos reais."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">{selectedAlert?.test_mode ? "🧪" : "🚧"}</div>
                <p className="text-sm text-muted-foreground">
                  {selectedAlert?.test_mode ? "Modo de Teste Ativo" : "Sistema de Pagamento em Configuração"}
                </p>
                <p className="text-lg font-bold">
                  R$ {selectedAlert && (selectedAlert.price_cents / 100).toFixed(2)}
                </p>
              </div>
            </div>
            {!selectedAlert?.test_mode && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Para o Streamer:</strong> Configure a integração com Stripe nas configurações para aceitar pagamentos reais e seguros.
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {selectedAlert?.test_mode ? "Cancelar" : "Entendi"}
            </Button>
            {selectedAlert?.test_mode && (
              <Button onClick={handleConfirmTestPayment} variant="hero">
                Confirmar Pagamento de Teste
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicStreamerPage;