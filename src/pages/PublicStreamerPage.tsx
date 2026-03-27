import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Music, Image as ImageIcon, Video, AlertCircle, Loader2, Copy, CheckCircle2, Clock, PauseCircle, MessageSquare, Sparkles } from "lucide-react";
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
  const [honeypot, setHoneypot] = useState<string>("");

  // Handle payment return from Mercado Pago
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus) {
      if (paymentStatus === "success") {
        toast({ title: "Pagamento realizado!", description: "Seu alerta foi adicionado à fila do streamer. Obrigado!" });
      } else if (paymentStatus === "failure") {
        toast({ title: "Pagamento não concluído", description: "O pagamento foi cancelado ou falhou. Tente novamente.", variant: "destructive" });
      } else if (paymentStatus === "pending") {
        toast({ title: "Pagamento pendente", description: "Seu pagamento está sendo processado. O alerta será exibido após a confirmação." });
      }
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
      if (diff <= 0) { setTimeLeft("Expirado"); return; }
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
    const handlePaymentUpdate = (status: string) => {
      if (status === 'paid') {
        setPixModalOpen(false); setPixData(null); setTransactionId(null); setSelectedAlert(null); setBuyerNote(""); setIsPolling(false);
        toast({ title: "Pagamento confirmado! ✅", description: "Seu alerta foi adicionado à fila do streamer. Obrigado pela compra!" });
      } else if (status === 'failed') {
        setIsPolling(false);
        toast({ title: "Pagamento não aprovado", description: "O pagamento foi recusado. Tente novamente.", variant: "destructive" });
      }
    };
    const channel = supabase.channel(`transaction-${transactionId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${transactionId}` }, (payload) => { handlePaymentUpdate(payload.new?.status); }).subscribe();
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase.from("transactions").select("status").eq("id", transactionId).single();
        if (data && (data.status === 'paid' || data.status === 'failed')) { handlePaymentUpdate(data.status); clearInterval(pollInterval); }
      } catch (error) { console.error("[PublicStreamerPage] Polling error:", error); }
    }, 5000);
    return () => { supabase.removeChannel(channel); clearInterval(pollInterval); setIsPolling(false); };
  }, [transactionId, pixModalOpen]);

  const { data: streamer, isLoading: streamerLoading } = useQuery({
    queryKey: ["public-streamer", cleanHandle],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_streamer_profile", { p_handle: cleanHandle }).single();
      if (error) throw error;
      if (!data) throw new Error("Streamer não encontrado");
      return data;
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["public-alerts", streamer?.id],
    queryFn: async () => {
      if (!streamer?.id) return [];
      const { data, error } = await supabase.from("alerts").select("*").eq("streamer_id", streamer.id).eq("status", "published").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!streamer?.id,
  });

  const handleAlertClick = (alert: any) => { setSelectedAlert(alert); setPurchaseModalOpen(true); };

  const handlePurchase = async () => {
    if (!selectedAlert || !streamer) return;
    setIsProcessingPayment(true);
    try {
      const newTransactionId = crypto.randomUUID();
      const { error } = await supabase.from("transactions").insert({ id: newTransactionId, streamer_id: streamer.id, alert_id: selectedAlert.id, amount_cents: selectedAlert.price_cents, status: "pending", currency: "BRL" });
      if (error) throw error;
      setTransactionId(newTransactionId);
      if (selectedAlert.test_mode) { setPurchaseModalOpen(false); setPaymentDialogOpen(true); setIsProcessingPayment(false); return; }
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-payment", { body: { transaction_id: newTransactionId, alert_title: selectedAlert.title, amount_cents: selectedAlert.price_cents, streamer_handle: cleanHandle, streamer_id: streamer.id, buyer_note: buyerNote.trim() || undefined, hp_field: honeypot } });
      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);
      setPixData(pixResponse); setPurchaseModalOpen(false); setPixModalOpen(true); setIsProcessingPayment(false);
    } catch (error: unknown) {
      const userError = createUserError(error, "payment");
      toast({ title: userError.title, description: userError.description, variant: "destructive" });
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmTestPayment = async () => {
    if (!transactionId || !selectedAlert) return;
    try {
      const { error: updateError } = await supabase.from("transactions").update({ status: "paid" }).eq("id", transactionId);
      if (updateError) throw updateError;
      const { error: queueError } = await supabase.from("alert_queue").insert({ transaction_id: transactionId, alert_id: selectedAlert.id, streamer_id: streamer!.id, status: "queued", is_test: true, payload: {} });
      if (queueError) throw queueError;
      toast({ title: "Pagamento de teste confirmado!", description: "Seu alerta foi adicionado à fila do streamer." });
      setPaymentDialogOpen(false); setTransactionId(null); setSelectedAlert(null);
    } catch (error: unknown) {
      const userError = createUserError(error, "payment");
      toast({ title: userError.title, description: userError.description, variant: "destructive" });
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast({ title: "Código copiado!", description: "Cole no app do seu banco para pagar." });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar o código.", variant: "destructive" });
    }
  };

  const handleClosePixModal = () => { setPixModalOpen(false); setPixData(null); setSelectedAlert(null); setTransactionId(null); setBuyerNote(""); setHoneypot(""); };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "audio": return <Music className="h-3.5 w-3.5" />;
      case "video": return <Video className="h-3.5 w-3.5" />;
      default: return <ImageIcon className="h-3.5 w-3.5" />;
    }
  };

  const getMediaPreview = (alert: any) => {
    const mediaUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/alerts/${alert.media_path}`;
    if (alert.media_type === "video") return <video src={mediaUrl} controls className="w-full max-h-96 rounded-md" />;
    if (alert.media_type === "audio") {
      const thumbUrl = alert.thumb_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/alerts/${alert.thumb_path}` : null;
      return (<div className="space-y-4">{thumbUrl && <img src={thumbUrl} alt="Capa do áudio" className="w-full rounded-md object-cover" />}<audio src={mediaUrl} controls className="w-full" /></div>);
    }
    return <img src={mediaUrl} alt={alert.title} className="w-full rounded-md object-cover" />;
  };

  if (streamerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[rgba(167,139,250,0.2)] border-t-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground mt-4 font-body">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in p-8">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">Streamer não encontrado</h1>
            <p className="font-body text-muted-foreground">O perfil que você procura não existe ou foi removido.</p>
          </div>
          <Button onClick={() => navigate("/")} size="lg" className="font-body">Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const initials = streamer.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.05)] sticky top-0 z-50 bg-[#0f0f11]/95 backdrop-blur-sm" style={{ padding: '16px 24px' }}>
        <div className="container mx-auto flex items-center justify-between">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-[38px] w-[38px] border border-[rgba(255,255,255,0.1)] bg-[#1c1c20]">
                <AvatarImage src={streamer.photo_url || undefined} className="object-cover" />
                <AvatarFallback className="font-display font-extrabold text-sm text-primary bg-[#1c1c20]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full bg-[#22c55e] border-2 border-[#0f0f11]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-[15px] leading-tight text-foreground">{streamer.display_name}</span>
              <span className="font-body text-[11px] text-[rgba(221,217,208,0.22)]">{streamer.handle}</span>
            </div>
          </div>

          {/* Right: Live badge + Logo */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[rgba(239,68,68,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(239,68,68,0.7)] live-dot" />
              <span className="font-body text-[10px] uppercase tracking-wider text-[rgba(239,68,68,0.7)]">Ao Vivo</span>
            </div>
            <Link to="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-[rgba(167,139,250,0.5)]">⚡</span>
              <span className="font-display text-[17px] font-extrabold text-[rgba(221,217,208,0.3)]">Streala</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 sm:px-8 pt-12 sm:pt-16 pb-10 sm:pb-14">
        <div className="max-w-[480px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-5 h-[1px] bg-[rgba(167,139,250,0.4)]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-[rgba(167,139,250,0.4)] font-body">
              Alertas disponíveis
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-[44px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white mb-3">
            Apareça{" "}
            <em className="font-body font-light text-[rgba(221,217,208,0.4)]" style={{ fontStyle: 'italic' }}>
              na live.
            </em>
          </h2>
          {streamer.bio && (
            <p className="font-body font-light text-sm text-[rgba(221,217,208,0.38)] leading-relaxed">{streamer.bio}</p>
          )}
        </div>
      </section>

      {/* Not Accepting Alerts Banner */}
      {streamer.accepting_alerts === false && (
        <div className="container mx-auto px-4 sm:px-8 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-yellow-500">
            <PauseCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-body font-medium text-sm">Este streamer não está aceitando alertas no momento</p>
              <p className="font-body text-xs opacity-70">Volte mais tarde.</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <section className="flex-1 container mx-auto px-4 sm:px-8 pb-12">
        {/* Separator line with count */}
        {alerts && alerts.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[rgba(221,217,208,0.22)] font-body whitespace-nowrap">
              {alerts.length} {alerts.length === 1 ? 'alerta disponível' : 'alertas disponíveis'}
            </span>
            <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        )}

        {alertsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgba(167,139,250,0.2)] border-t-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4 font-body text-sm">Carregando alertas...</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {alerts.map((alert) => {
              const isDisabled = streamer.accepting_alerts === false;
              return (
                <div
                  key={alert.id}
                  className={`group card-shimmer rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] transition-all duration-300 overflow-hidden ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:border-[rgba(167,139,250,0.2)] hover:bg-[rgba(167,139,250,0.03)] hover:-translate-y-[3px]'
                  }`}
                  onClick={() => !isDisabled && handleAlertClick(alert)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-[#16161a]">
                    {alert.media_type === "video" && !alert.thumb_path ? (
                      <video src={alert.media_path} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                    ) : (
                      <img src={alert.thumb_path || alert.media_path} alt={alert.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                    {/* Type badge - bottom left */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(15,15,17,0.8)] border border-[rgba(255,255,255,0.08)]">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      <span className="text-[10px] font-body text-foreground capitalize">{alert.media_type}</span>
                    </div>
                    {alert.test_mode && (
                      <Badge variant="outline" className="absolute top-2.5 left-2.5 bg-yellow-500/90 text-yellow-950 border-yellow-600 text-[10px]">
                        🧪 Teste
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 pb-2">
                    <h3 className="font-display font-bold text-[16px] mb-1 text-foreground">{alert.title}</h3>
                    {alert.description && (
                      <p className="font-body text-[11px] text-[rgba(221,217,208,0.22)] line-clamp-2">{alert.description}</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 pt-1 flex items-center justify-between">
                    <span className={`font-display font-extrabold text-[20px] ${alert.price_cents > 10000 ? 'text-accent-warm' : 'text-primary'}`}>
                      R$ {(alert.price_cents / 100).toFixed(2)}
                    </span>
                    {!isDisabled && (
                      <span className="font-body text-[11px] text-[rgba(167,139,250,0.4)] send-reveal">
                        enviar →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold mb-2">Nenhum alerta disponível</h3>
              <p className="font-body text-sm text-muted-foreground">Este streamer ainda não tem alertas publicados.</p>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)]" style={{ padding: '20px 32px' }}>
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-body text-[11px] text-[rgba(221,217,208,0.22)]">
            Powered by <strong className="text-[rgba(167,139,250,0.4)]">Streala</strong>
          </span>
          <Link to="/" className="font-body text-[11px] text-[rgba(221,217,208,0.22)] hover:text-[rgba(221,217,208,0.5)] transition-colors">
            Seja um Streamer →
          </Link>
        </div>
      </footer>

      {/* Purchase Modal */}
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto border-[rgba(255,255,255,0.06)] bg-[#0f0f11]">
          <DialogHeader>
            <DialogTitle className="font-display">Comprar Alerta</DialogTitle>
            <DialogDescription className="font-body font-light">Este alerta aparecerá na live após a confirmação do pagamento.</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden">{getMediaPreview(selectedAlert)}</div>
              <div>
                <h3 className="font-display text-2xl font-bold mb-2">{selectedAlert.title}</h3>
                {selectedAlert.description && <p className="font-body text-sm text-muted-foreground">{selectedAlert.description}</p>}
              </div>
              <div className="space-y-2">
                <label className="font-body text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" />Mensagem para o streamer (opcional)</label>
                <textarea value={buyerNote} onChange={(e) => setBuyerNote(e.target.value.slice(0, 200))} placeholder="Ex: Manda salve pro João! 🎉" className="w-full p-3 rounded-lg border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-sm font-body resize-none h-20 focus:border-[rgba(167,139,250,0.45)] focus:outline-none transition-colors" maxLength={200} />
                <p className="text-xs font-body text-muted-foreground text-right">{buyerNote.length}/200</p>
              </div>
              <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true" tabIndex={-1}>
                <label htmlFor="hp_field">Leave this empty</label>
                <input type="text" id="hp_field" name="hp_field" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} autoComplete="off" tabIndex={-1} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
                  {getMediaIcon(selectedAlert.media_type)}
                  <span className="font-body text-[10px] capitalize">{selectedAlert.media_type}</span>
                </div>
                <span className={`font-display font-extrabold text-2xl sm:text-3xl ${selectedAlert.price_cents > 10000 ? 'text-accent-warm' : 'text-primary'}`}>
                  R$ {(selectedAlert.price_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseModalOpen(false)} disabled={isProcessingPayment} className="font-body">Cancelar</Button>
            <Button onClick={handlePurchase} disabled={isProcessingPayment} className="font-body">
              {isProcessingPayment ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PIX...</>) : `Pagar com PIX - R$ ${selectedAlert && (selectedAlert.price_cents / 100).toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIX Payment Modal */}
      <Dialog open={pixModalOpen} onOpenChange={handleClosePixModal}>
        <DialogContent className="max-w-md border-[rgba(255,255,255,0.06)] bg-[#0f0f11]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display"><div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />Pagamento PIX</DialogTitle>
            <DialogDescription className="font-body font-light">Escaneie o QR code ou copie o código para pagar</DialogDescription>
          </DialogHeader>
          {pixData && (
            <div className="space-y-6">
              <div className="flex justify-center"><div className="p-4 bg-white rounded-lg"><img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" /></div></div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center font-body">Ou copie o código abaixo:</p>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-[rgba(255,255,255,0.04)] rounded-lg text-xs font-mono break-all max-h-20 overflow-y-auto border border-[rgba(255,255,255,0.06)]">{pixData.qr_code}</div>
                  <Button variant="outline" size="icon" onClick={handleCopyPixCode} className="shrink-0">{copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-body">
                <Clock className="h-4 w-4" />
                <span>Expira em: <strong className={timeLeft === "Expirado" ? "text-destructive" : "text-foreground"}>{timeLeft}</strong></span>
              </div>
              <div className="text-center text-sm text-muted-foreground space-y-1 font-body font-light">
                <p>1. Abra o app do seu banco</p>
                <p>2. Escolha pagar com PIX</p>
                <p>3. Escaneie o QR code ou cole o código</p>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={handleClosePixModal} className="w-full font-body">Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Test Mode */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent className="border-[rgba(255,255,255,0.06)] bg-[#0f0f11]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">🧪 Pagamento de Teste</AlertDialogTitle>
            <AlertDialogDescription className="font-body font-light">Este alerta está em modo de teste. Você pode simular um pagamento sem custos reais.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="font-body">Cancelar</Button>
            <Button onClick={handleConfirmTestPayment} className="font-body">Confirmar Pagamento de Teste</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicStreamerPage;
