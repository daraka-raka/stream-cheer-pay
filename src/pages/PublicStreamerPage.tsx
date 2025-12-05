import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Music, Image as ImageIcon, Video, AlertCircle, Loader2, Copy, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface PixData {
  qr_code_base64: string;
  qr_code: string;
  expires_at: string;
  payment_id: number;
}

const PublicStreamerPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // Remove @ prefix if present
  const cleanHandle = handle?.startsWith('@') ? handle.slice(1) : handle;
  console.debug('[PublicStreamerPage] raw handle:', handle);
  console.debug('[PublicStreamerPage] clean handle:', cleanHandle);
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

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

  // Timer for PIX expiration
  useEffect(() => {
    if (!pixData?.expires_at || !pixModalOpen) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(pixData.expires_at).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft("Expirado");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [pixData?.expires_at, pixModalOpen]);

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
      // Generate UUID on frontend to avoid needing SELECT permission after INSERT
      const newTransactionId = crypto.randomUUID();

      const { error } = await supabase
        .from("transactions")
        .insert({
          id: newTransactionId,
          streamer_id: streamer.id,
          alert_id: selectedAlert.id,
          amount_cents: selectedAlert.price_cents,
          status: "pending",
          currency: "BRL",
        });

      if (error) throw error;

      setTransactionId(newTransactionId);

      // If test mode, show test payment dialog
      if (selectedAlert.test_mode) {
        setPurchaseModalOpen(false);
        setPaymentDialogOpen(true);
        setIsProcessingPayment(false);
        return;
      }

      // For real payments, create PIX payment
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke(
        "create-pix-payment",
        {
          body: {
            transaction_id: newTransactionId,
            alert_title: selectedAlert.title,
            amount_cents: selectedAlert.price_cents,
            streamer_handle: cleanHandle,
          },
        }
      );

      if (pixError) throw pixError;

      if (pixResponse?.error) {
        throw new Error(pixResponse.error);
      }

      // Show PIX modal with QR code
      setPixData(pixResponse);
      setPurchaseModalOpen(false);
      setPixModalOpen(true);
      setIsProcessingPayment(false);
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
          payload: {},
        });

      if (queueError) throw queueError;

      toast({
        title: "Pagamento de teste confirmado!",
        description: "Seu alerta foi adicionado à fila do streamer.",
      });

      setPaymentDialogOpen(false);
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

  const handleCopyPixCode = async () => {
    if (!pixData?.qr_code) return;

    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  const handleClosePixModal = () => {
    setPixModalOpen(false);
    setPixData(null);
    setSelectedAlert(null);
    setTransactionId(null);
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
                  Gerando PIX...
                </>
              ) : (
                `Pagar com PIX - R$ ${selectedAlert && (selectedAlert.price_cents / 100).toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIX Payment Modal */}
      <Dialog open={pixModalOpen} onOpenChange={handleClosePixModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR code ou copie o código para pagar
            </DialogDescription>
          </DialogHeader>
          
          {pixData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Copy Code Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Ou copie o código abaixo:
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md text-xs font-mono break-all max-h-20 overflow-y-auto">
                    {pixData.qr_code}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPixCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expira em: <strong className={timeLeft === "Expirado" ? "text-destructive" : "text-foreground"}>{timeLeft}</strong></span>
              </div>

              {/* Instructions */}
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>1. Abra o app do seu banco</p>
                <p>2. Escolha pagar com PIX</p>
                <p>3. Escaneie o QR code ou cole o código</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePixModal} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Test Mode */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🧪 Pagamento de Teste</AlertDialogTitle>
            <AlertDialogDescription>
              Este alerta está em modo de teste. Você pode simular um pagamento sem custos reais. Em produção, será usada a integração com Mercado Pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmTestPayment}>
              Confirmar Pagamento de Teste
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicStreamerPage;
