import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Music, Image as ImageIcon, Video, AlertCircle, Loader2, Copy, CheckCircle2, Clock, PauseCircle, MessageSquare, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { sanitizeErrorMessage, createUserError } from "@/lib/error-utils";
import { pixPaymentSchema } from "@/lib/validations";
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
  const [buyerNote, setBuyerNote] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [honeypot, setHoneypot] = useState<string>(""); // Honeypot anti-spam field

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

  // Realtime listener for PIX payment confirmation with polling fallback
  useEffect(() => {
    if (!transactionId || !pixModalOpen) return;

    console.log("[PublicStreamerPage] Setting up realtime listener for transaction:", transactionId);

    const handlePaymentUpdate = (status: string) => {
      if (status === 'paid') {
        setPixModalOpen(false);
        setPixData(null);
        setTransactionId(null);
        setSelectedAlert(null);
        setBuyerNote("");
        setIsPolling(false);
        
        toast({
          title: "Pagamento confirmado! ✅",
          description: "Seu alerta foi adicionado à fila do streamer. Obrigado pela compra!",
        });
      } else if (status === 'failed') {
        setIsPolling(false);
        toast({
          title: "Pagamento não aprovado",
          description: "O pagamento foi recusado. Tente novamente.",
          variant: "destructive",
        });
      }
    };

    // Realtime subscription
    const channel = supabase
      .channel(`transaction-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          console.log("[PublicStreamerPage] Transaction updated via realtime:", payload);
          handlePaymentUpdate(payload.new?.status);
        }
      )
      .subscribe();

    // Polling fallback - check every 5 seconds
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("transactions")
          .select("status")
          .eq("id", transactionId)
          .single();
        
        if (data && (data.status === 'paid' || data.status === 'failed')) {
          console.log("[PublicStreamerPage] Transaction updated via polling:", data.status);
          handlePaymentUpdate(data.status);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("[PublicStreamerPage] Polling error:", error);
      }
    }, 5000);

    return () => {
      console.log("[PublicStreamerPage] Cleaning up transaction listener:", transactionId);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [transactionId, pixModalOpen]);

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
            streamer_id: streamer.id,
            buyer_note: buyerNote.trim() || undefined,
            hp_field: honeypot, // Honeypot field for anti-spam
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
    } catch (error: unknown) {
      console.error("[PublicStreamerPage] Purchase error:", error);
      const userError = createUserError(error, "payment");
      toast({
        title: userError.title,
        description: userError.description,
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
    } catch (error: unknown) {
      const userError = createUserError(error, "payment");
      toast({
        title: userError.title,
        description: userError.description,
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
    setBuyerNote("");
    setHoneypot("");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground mt-4 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in p-8">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Streamer não encontrado</h1>
            <p className="text-muted-foreground">O perfil que você procura não existe ou foi removido.</p>
          </div>
          <Button onClick={() => navigate("/")} size="lg">
            Voltar ao início
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Premium Header */}
      <header className="border-b bg-gradient-to-r from-primary/5 via-background to-secondary/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Streala
            </span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
        
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col items-center text-center animate-fade-in">
            {/* Avatar with Glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl scale-110" />
              <Avatar className="h-28 w-28 md:h-36 md:w-36 relative ring-4 ring-primary/30 shadow-2xl">
                <AvatarImage src={streamer.photo_url || undefined} className="object-cover" />
                <AvatarFallback className="text-3xl md:text-4xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name & Handle */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2">
              {streamer.display_name}
            </h1>
            <p className="text-lg md:text-xl text-primary font-medium mb-4">
              @{streamer.handle}
            </p>

            {/* Bio */}
            {streamer.bio && (
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg mb-6 leading-relaxed">
                {streamer.bio}
              </p>
            )}

            {/* Alerts Badge */}
            <Badge variant="secondary" className="text-sm px-4 py-2 gap-2">
              <Sparkles className="h-4 w-4" />
              {alerts?.length || 0} Alertas Disponíveis
            </Badge>
          </div>
        </div>
      </section>

      {/* Not Accepting Alerts Banner */}
      {streamer.accepting_alerts === false && (
        <div className="container mx-auto px-4 -mt-4 mb-4">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <PauseCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Este streamer não está aceitando alertas no momento</p>
              <p className="text-sm opacity-80">Volte mais tarde para ver os alertas disponíveis.</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <section className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {/* Section Title */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Escolha seu Alerta <span className="inline-block animate-pulse">🎉</span>
          </h2>
          <p className="text-muted-foreground">
            Clique em um alerta para enviar para a live
          </p>
        </div>

        {alertsLoading ? (
          <div className="text-center py-12">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            </div>
            <p className="text-muted-foreground mt-4">Carregando alertas...</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {alerts.map((alert, index) => {
              const thumbUrl = alert.thumb_path || alert.media_path;
              const isDisabled = streamer.accepting_alerts === false;

              return (
                <Card
                  key={alert.id}
                  className={`group transition-all duration-300 relative overflow-hidden border-2 ${
                    isDisabled 
                      ? 'opacity-60 cursor-not-allowed border-border' 
                      : 'cursor-pointer border-border hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:-translate-y-1'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => !isDisabled && handleAlertClick(alert)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={thumbUrl}
                        alt={alert.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Badge className="absolute top-3 right-3 shadow-lg">
                        {getMediaIcon(alert.media_type)}
                        <span className="ml-1 capitalize">{alert.media_type}</span>
                      </Badge>
                      {alert.test_mode && (
                        <Badge variant="outline" className="absolute top-3 left-3 bg-yellow-500/90 text-yellow-950 border-yellow-600 shadow-lg">
                          🧪 Teste
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pb-2">
                    <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                      {alert.title}
                    </CardTitle>
                    {alert.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 pt-2 flex items-center justify-between">
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      R$ {(alert.price_cents / 100).toFixed(2)}
                    </span>
                    {!isDisabled && (
                      <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Comprar
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhum alerta disponível</h3>
              <p className="text-muted-foreground">
                Este streamer ainda não tem alertas publicados.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Powered by <strong className="text-foreground">Streala</strong></span>
          </div>
          <Link 
            to="/" 
            className="hover:text-primary transition-colors font-medium"
          >
            Seja um Streamer →
          </Link>
        </div>
      </footer>

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
              
              {/* Buyer Note Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem para o streamer (opcional)
                </label>
                <textarea
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value.slice(0, 200))}
                  placeholder="Ex: Manda salve pro João! 🎉"
                  className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none h-20"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {buyerNote.length}/200 caracteres
                </p>
              </div>

              {/* Honeypot field - hidden from humans, visible to bots */}
              <div 
                className="absolute left-[-9999px] top-[-9999px]" 
                aria-hidden="true"
                tabIndex={-1}
              >
                <label htmlFor="hp_field">Leave this empty</label>
                <input
                  type="text"
                  id="hp_field"
                  name="hp_field"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                />
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
