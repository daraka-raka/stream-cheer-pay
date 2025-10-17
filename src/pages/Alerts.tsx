import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    mediaType: "image",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreamerAndAlerts();
    }
  }, [user]);

  const loadStreamerAndAlerts = async () => {
    try {
      const { data: streamerData, error: streamerError } = await supabase
        .from("streamers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (streamerError) throw streamerError;
      setStreamerId(streamerData.id);

      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("streamer_id", streamerData.id)
        .order("created_at", { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!streamerId) return;

    // Validações
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue < 1) {
      toast.error("Preço mínimo é R$ 1,00");
      return;
    }

    if (!selectedFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    // Verificar limite de 20 alertas
    if (alerts.length >= 20) {
      toast.error("Você atingiu o limite de 20 alertas");
      return;
    }

    // Validar tamanho do arquivo (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 50MB");
      return;
    }

    // Validar tipo MIME
    const allowedTypes = ["image/", "audio/", "video/"];
    if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
      toast.error("Tipo de arquivo não permitido");
      return;
    }

    setUploading(true);

    try {
      // Upload do arquivo
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${streamerId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("alerts")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("alerts")
        .getPublicUrl(fileName);

      // Criar registro no banco
      const { error: insertError } = await supabase.from("alerts").insert({
        streamer_id: streamerId,
        title: formData.title,
        description: formData.description || null,
        price_cents: Math.round(priceValue * 100),
        media_type: formData.mediaType,
        media_path: publicUrl,
        status: "published",
      });

      if (insertError) throw insertError;

      toast.success("Alerta criado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", price: "", mediaType: "image" });
      setSelectedFile(null);
      loadStreamerAndAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
      toast.error("Erro ao criar alerta");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus alertas de mídia (máximo 20)
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar Novo Alerta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loading
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </Card>
            ))
          ) : alerts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                Você ainda não criou nenhum alerta
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted relative">
                  {alert.thumb_path && (
                    <img
                      src={alert.thumb_path}
                      alt={alert.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      R$ {(alert.price_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {alert.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1">
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="h-3 w-3" />
                      Testar
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dialog para criar alerta */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Alerta</DialogTitle>
              <DialogDescription>
                Adicione um novo alerta de mídia. Limite: {alerts.length}/20
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nome do alerta"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="1.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mediaType">Tipo de Mídia *</Label>
                <Select
                  value={formData.mediaType}
                  onValueChange={(value) => setFormData({ ...formData, mediaType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file">Arquivo * (máx. 50MB)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,audio/*,video/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAlert} disabled={uploading}>
                {uploading ? "Criando..." : "Criar Alerta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
