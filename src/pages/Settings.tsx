import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CheckCircle, AlertCircle, Upload, Mail, Pause, Play, CreditCard, Loader2, ExternalLink, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileSchema } from "@/lib/validations";

// Helper function to generate URL-friendly handle from display name
const generateHandle = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/-+/g, "_") // Replace hyphens with underscores
    .replace(/_+/g, "_") // Remove duplicate underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
};

// Helper function to get commission tier based on monthly revenue (in cents)
const getCommissionTier = (revenueCents: number): { tier: number; rate: number } => {
  const revenueReais = revenueCents / 100;
  if (revenueReais < 500) return { tier: 0, rate: 5 };
  if (revenueReais < 1000) return { tier: 1, rate: 4 };
  if (revenueReais < 5000) return { tier: 2, rate: 3 };
  return { tier: 3, rate: 2.5 };
};

// MP Client ID will be loaded from edge function or environment
const MP_CLIENT_ID = import.meta.env.VITE_MP_CLIENT_ID || "";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streamer, setStreamer] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [imageDuration, setImageDuration] = useState(5);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  
  // Mercado Pago config
  const [mpConfig, setMpConfig] = useState<any>(null);
  const [mpLoading, setMpLoading] = useState(false);
  
  // Monthly revenue state
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  
  // Advanced preferences
  const [acceptingAlerts, setAcceptingAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notifyOnMilestone, setNotifyOnMilestone] = useState(false);
  const [milestoneAmount, setMilestoneAmount] = useState(1000);
  const [widgetPosition, setWidgetPosition] = useState("center");
  const [alertStartDelay, setAlertStartDelay] = useState(0);
  const [alertBetweenDelay, setAlertBetweenDelay] = useState(1);
  
  // Dashboard customization
  const [showTicketMedio, setShowTicketMedio] = useState(false);
  const [showTaxaConversao, setShowTaxaConversao] = useState(false);
  const [showPendentes, setShowPendentes] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreamerData();
    }
  }, [user]);

  // Check for MP connection success
  useEffect(() => {
    if (searchParams.get("mp") === "connected") {
      toast.success("Mercado Pago conectado com sucesso!");
      // Reload MP config
      if (streamer) {
        loadMpConfig(streamer.id);
      }
    }
  }, [searchParams, streamer]);

  useEffect(() => {
    if (streamer) {
      setDisplayName(streamer.display_name || "");
      setBio(streamer.bio || "");
      setPreviewPhoto(streamer.photo_url || null);
      loadMpConfig(streamer.id);
      loadMonthlyRevenue(streamer.id);
    }
  }, [streamer]);

  useEffect(() => {
    if (settings) {
      setImageDuration(settings.overlay_image_duration_seconds || 5);
      setAcceptingAlerts(settings.accepting_alerts ?? true);
      setWebhookUrl(settings.webhook_url || "");
      setEmailNotifications(settings.email_notifications ?? true);
      setNotifyOnMilestone(settings.notify_on_milestone ?? false);
      setMilestoneAmount((settings.milestone_amount_cents || 100000) / 100);
      setWidgetPosition(settings.widget_position || "center");
      setAlertStartDelay(settings.alert_start_delay_seconds ?? 0);
      setAlertBetweenDelay(settings.alert_between_delay_seconds ?? 1);
      setShowTicketMedio(settings.show_ticket_medio ?? false);
      setShowTaxaConversao(settings.show_taxa_conversao ?? false);
      setShowPendentes(settings.show_pendentes ?? false);
    }
  }, [settings]);

  const loadMpConfig = async (streamerId: string) => {
    try {
      const { data, error } = await supabase
        .from("streamer_mp_config")
        .select("mp_user_id, commission_rate, created_at")
        .eq("streamer_id", streamerId)
        .maybeSingle();

      if (!error && data) {
        setMpConfig(data);
      }
    } catch (error) {
      console.error("Error loading MP config:", error);
    }
  };

  const loadMonthlyRevenue = async (streamerId: string) => {
    try {
      // Get first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data, error } = await supabase
        .from("transactions")
        .select("amount_cents")
        .eq("streamer_id", streamerId)
        .eq("status", "paid")
        .gte("created_at", firstDayOfMonth);

      if (error) throw error;

      const total = data?.reduce((sum, tx) => sum + tx.amount_cents, 0) || 0;
      setMonthlyRevenue(total);
    } catch (error) {
      console.error("Error loading monthly revenue:", error);
    }
  };

  const loadStreamerData = async () => {
    try {
      setLoading(true);
      
      const { data: streamerData, error: streamerError } = await supabase
        .from("streamers")
        .select("*")
        .eq("auth_user_id", user?.id)
        .single();

      if (streamerError) throw streamerError;
      setStreamer(streamerData);

      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("streamer_id", streamerData.id)
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        throw settingsError;
      }
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Tamanho máximo: 5MB");
      return;
    }

    setPhotoFile(file);
    setPreviewPhoto(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!streamer) return;

    // Validate with zod schema
    try {
      const validationData = {
        display_name: displayName.trim(),
        bio: bio.trim() || '',
        handle: generateHandle(displayName)
      };
      
      const result = profileSchema.safeParse(validationData);
      if (!result.success) {
        const error = result.error.errors[0];
        toast.error(error.message);
        return;
      }
    } catch (error) {
      toast.error("Erro na validação dos dados");
      return;
    }

    try {
      setSaving(true);

      // Generate handle from display name
      const newHandle = generateHandle(displayName);

      // Check if handle is unique (if changed)
      if (newHandle !== streamer.handle) {
        const { data: existingStreamer } = await supabase
          .from("streamers")
          .select("id")
          .eq("handle", newHandle)
          .neq("id", streamer.id)
          .maybeSingle();

        if (existingStreamer) {
          toast.error("Este nome já está em uso. Tente outro.");
          return;
        }
      }

      let photoUrl = streamer.photo_url;

      // Upload photo if changed
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${streamer.id}/profile.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("alerts")
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("alerts").getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Update streamer profile
      const { error: updateError } = await supabase
        .from("streamers")
        .update({
          display_name: displayName.trim(),
          handle: newHandle,
          bio: bio.trim() || null,
          photo_url: photoUrl,
        })
        .eq("id", streamer.id);

      if (updateError) throw updateError;

      toast.success("Perfil atualizado com sucesso!");
      setPhotoFile(null);
      await loadStreamerData();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!streamer) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("settings")
        .upsert({
          streamer_id: streamer.id,
          overlay_image_duration_seconds: imageDuration,
          accepting_alerts: acceptingAlerts,
          theme: theme || "system",
          webhook_url: webhookUrl.trim() || null,
          email_notifications: emailNotifications,
          notify_on_milestone: notifyOnMilestone,
          milestone_amount_cents: Math.round(milestoneAmount * 100),
          widget_position: widgetPosition,
          alert_start_delay_seconds: alertStartDelay,
          alert_between_delay_seconds: alertBetweenDelay,
          show_ticket_medio: showTicketMedio,
          show_taxa_conversao: showTaxaConversao,
          show_pendentes: showPendentes,
        });

      if (error) throw error;

      toast.success("Preferências salvas com sucesso!");
      await loadStreamerData();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu perfil e preferências
          </p>
        </div>

        {/* Configurações de Recebimento - Mercado Pago */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Configurações de Recebimento</h2>
          </div>
          
          {mpConfig ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Mercado Pago conectado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID da conta: {mpConfig.mp_user_id}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    toast.info("Para desconectar, entre em contato com o suporte.");
                  }}
                >
                  Desconectar
                </Button>
              </div>
              
              {/* Monthly revenue display */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="font-medium text-primary">Seu faturamento este mês</p>
                </div>
                <p className="text-2xl font-bold">
                  R$ {(monthlyRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa atual: {getCommissionTier(monthlyRevenue).rate}%
                </p>
              </div>

              {/* Tiered commission table */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium mb-3">Faixas de Comissão Mensal:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {[
                    { range: "R$ 0 - R$ 500", rate: "5%", tier: 0 },
                    { range: "R$ 500 - R$ 1.000", rate: "4%", tier: 1 },
                    { range: "R$ 1.000 - R$ 5.000", rate: "3%", tier: 2 },
                    { range: "Acima de R$ 5.000", rate: "2,5%", tier: 3 },
                  ].map((item) => {
                    const currentTier = getCommissionTier(monthlyRevenue).tier;
                    const isActive = item.tier === currentTier;
                    return (
                      <div 
                        key={item.tier}
                        className={`flex justify-between items-center p-3 rounded-lg transition-all ${
                          isActive 
                            ? "bg-primary/20 border-2 border-primary ring-2 ring-primary/30" 
                            : "bg-background border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive && <CheckCircle className="h-4 w-4 text-primary" />}
                          <span className={isActive ? "font-medium" : ""}>{item.range}</span>
                        </div>
                        <span className={`font-bold ${isActive ? "text-primary" : ""}`}>{item.rate}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  A taxa é calculada com base no seu faturamento mensal e reinicia todo dia 1º.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Você receberá os pagamentos diretamente na sua conta do Mercado Pago, 
                já com a comissão da plataforma descontada automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">
                  Conecte sua conta do Mercado Pago para receber pagamentos diretamente. 
                  A comissão da plataforma será descontada automaticamente de cada venda.
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (!MP_CLIENT_ID) {
                    toast.error("Configuração do Mercado Pago não encontrada");
                    return;
                  }
                  if (!streamer?.id) {
                    toast.error("Erro ao identificar streamer");
                    return;
                  }
                  
                  setMpLoading(true);
                  const redirectUri = `${window.location.origin}/auth/callback/mercadopago`;
                  const state = btoa(JSON.stringify({ streamer_id: streamer.id }));
                  
                  const authUrl = `https://auth.mercadopago.com.br/authorization?` +
                    `client_id=${MP_CLIENT_ID}&` +
                    `response_type=code&` +
                    
                    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `state=${state}`;
                  
                  window.location.href = authUrl;
                }}
                disabled={mpLoading || !MP_CLIENT_ID}
                className="w-full sm:w-auto"
              >
                {mpLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Conectar Mercado Pago
                  </>
                )}
              </Button>
              {!MP_CLIENT_ID && (
                <p className="text-sm text-destructive">
                  ⚠️ VITE_MP_CLIENT_ID não configurado no ambiente
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Aceitar Alertas */}
        <Card className={`p-6 ${!acceptingAlerts ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {acceptingAlerts ? (
                <Play className="h-5 w-5 text-green-500" />
              ) : (
                <Pause className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <h2 className="text-lg font-semibold">Aceitar Alertas</h2>
                <p className="text-sm text-muted-foreground">
                  {acceptingAlerts 
                    ? "Sua página está aceitando compras de alertas" 
                    : "Viewers não podem comprar alertas no momento"}
                </p>
              </div>
            </div>
            <Switch
              checked={acceptingAlerts}
              onCheckedChange={(checked) => {
                setAcceptingAlerts(checked);
                // Auto-save this setting immediately
                if (streamer) {
                  supabase
                    .from("settings")
                    .upsert({
                      streamer_id: streamer.id,
                      accepting_alerts: checked,
                    })
                    .then(({ error }) => {
                      if (error) {
                        toast.error("Erro ao salvar configuração");
                        setAcceptingAlerts(!checked);
                      } else {
                        toast.success(checked ? "Alertas ativados!" : "Alertas pausados!");
                      }
                    });
                }
              }}
            />
          </div>
        </Card>

        {/* Perfil do Streamer */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Perfil do Streamer</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={previewPhoto || undefined} />
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {streamer?.photo_url ? "Alterar Logo" : "Adicionar Logo"}
                  </div>
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG (máx. 5MB)
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Seu handle será: @{generateHandle(displayName) || "seu_nome"}
              </p>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Conte um pouco sobre você..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </div>
        </Card>

        {/* Links Públicos */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Links Públicos</h2>
          <div className="space-y-4">
            <div>
              <Label>Página Pública</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  readOnly
                  value={`${window.location.origin}/@${streamer?.handle || "seu_handle"}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/@${streamer?.handle}`,
                      "Link da página"
                    )
                  }
                  disabled={!streamer?.handle}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Widget URL (para OBS/Streamlabs)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  readOnly
                  value={`${window.location.origin}/overlay.html?key=${streamer?.public_key || "sua-chave"}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/overlay.html?key=${streamer?.public_key}`,
                      "Widget URL"
                    )
                  }
                  disabled={!streamer?.public_key}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                <p className="font-medium">📺 Como configurar no OBS:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Adicionar fonte → Browser</li>
                  <li>Colar a URL acima</li>
                  <li>Configurar: 1920x1080, 30 FPS</li>
                  <li>✅ Marcar "Shutdown source when not visible"</li>
                </ol>
                <p className="text-xs italic">
                  Alertas aparecerão automaticamente quando alguém comprar. 
                  Use o botão "Testar" na página de Alertas para verificar.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Verificação de Email */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Verificação de Email</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {streamer?.email_verified ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-500">Email verificado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-500">Email não verificado</span>
                </>
              )}
            </div>
            {!streamer?.email_verified && (
              <Button variant="outline">Reenviar Email</Button>
            )}
          </div>
        </Card>

        {/* Notificações por Email */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notificações por Email</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificar novas vendas</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um email quando alguém comprar um alerta
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificar marcos de receita</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um email ao atingir um valor de receita
                </p>
              </div>
              <Switch
                checked={notifyOnMilestone}
                onCheckedChange={setNotifyOnMilestone}
              />
            </div>
            {notifyOnMilestone && (
              <div>
                <Label htmlFor="milestoneAmount">Valor do Marco (R$)</Label>
                <Input
                  id="milestoneAmount"
                  type="number"
                  min="100"
                  step="100"
                  value={milestoneAmount}
                  onChange={(e) => setMilestoneAmount(parseInt(e.target.value) || 1000)}
                  className="mt-1 max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Você será notificado ao atingir R$ {milestoneAmount.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
          </div>
        </Card>


        {/* Personalização do Dashboard */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Personalização do Dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha quais cards exibir no resumo do Dashboard
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar Ticket Médio</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe o valor médio por transação
                </p>
              </div>
              <Switch
                checked={showTicketMedio}
                onCheckedChange={setShowTicketMedio}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar Taxa de Conversão</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe a porcentagem de transações pagas
                </p>
              </div>
              <Switch
                checked={showTaxaConversao}
                onCheckedChange={setShowTaxaConversao}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar Pendentes</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe quantas transações estão aguardando pagamento
                </p>
              </div>
              <Switch
                checked={showPendentes}
                onCheckedChange={setShowPendentes}
              />
            </div>
          </div>
        </Card>

        {/* Preferências Gerais */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Preferências Gerais</h2>
          <div className="space-y-4">
            <div>
              <Label>Tema</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex-1"
                >
                  Claro
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                >
                  Escuro
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                  className="flex-1"
                >
                  Sistema
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="imageDuration">
                Duração de Imagens no Widget (segundos)
              </Label>
              <Input
                id="imageDuration"
                type="number"
                min="3"
                max="10"
                value={imageDuration}
                onChange={(e) => setImageDuration(parseInt(e.target.value) || 5)}
                className="mt-1 max-w-[200px]"
              />
            </div>
            <div>
              <Label htmlFor="alertStartDelay">Delay antes do alerta aparecer (segundos)</Label>
              <Input
                id="alertStartDelay"
                type="number"
                min="0"
                max="10"
                value={alertStartDelay}
                onChange={(e) => setAlertStartDelay(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                className="mt-1 max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O alerta aguarda X segundos antes de aparecer na tela (0-10s)
              </p>
            </div>
            <div>
              <Label htmlFor="alertBetweenDelay">Delay entre alertas (segundos)</Label>
              <Input
                id="alertBetweenDelay"
                type="number"
                min="0"
                max="10"
                value={alertBetweenDelay}
                onChange={(e) => setAlertBetweenDelay(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                className="mt-1 max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo de espera entre um alerta e o próximo (0-10s)
              </p>
            </div>
            <Button onClick={handleSavePreferences} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar Todas as Preferências"}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
