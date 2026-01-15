import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Play, Trash2, Copy, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { alertSchema } from "@/lib/validations";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ImageCropper } from "@/components/ImageCropper";

export default function Alerts() {
  const { user } = useAuth();
  const location = useLocation();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any | null>(null);
  const [previewAlert, setPreviewAlert] = useState<any | null>(null);
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  const [streamerId, setStreamerId] = useState<string | null>(null);
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    mediaType: "image",
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Image cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<'media' | 'cover' | 'thumbnail'>('media');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStreamerAndAlerts();
    }
  }, [user]);

  // Handle highlight from Top Alerts navigation
  useEffect(() => {
    const state = location.state as { highlightAlertId?: string } | null;
    if (state?.highlightAlertId && !loading) {
      setHighlightedAlertId(state.highlightAlertId);
      
      // Scroll to highlighted alert after a short delay
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedAlertId(null);
      }, 3000);
      
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  // Handle video preview URL
  useEffect(() => {
    if (mediaFile && formData.mediaType === "video") {
      const url = URL.createObjectURL(mediaFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [mediaFile, formData.mediaType]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, []);

  // Handle image selection for cropper
  const handleImageSelect = (file: File, type: 'media' | 'cover' | 'thumbnail') => {
    if (!file.type.startsWith('image/')) {
      // If not an image (audio/video), set directly
      if (type === 'media') setMediaFile(file);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setCropperImageSrc(url);
    setCropperType(type);
    setShowCropper(true);
  };

  // Handle crop completion
  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(croppedBlob);
    
    if (cropperType === 'media') {
      setMediaFile(file);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(previewUrl);
    } else if (cropperType === 'cover') {
      setCoverImage(file);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(previewUrl);
    } else {
      setThumbnailFile(file);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl(previewUrl);
    }
    
    setShowCropper(false);
    if (cropperImageSrc) URL.revokeObjectURL(cropperImageSrc);
    setCropperImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (cropperImageSrc) URL.revokeObjectURL(cropperImageSrc);
    setCropperImageSrc(null);
  };

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

  const handleTestAlert = async (alertId: string) => {
    if (!streamerId) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-alert-queue", {
        body: {
          action: "create_test",
          alert_id: alertId,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de testes atingido. Máximo 10 por hora.");
        } else {
          toast.error(data.error);
        }
        return;
      }
      
      toast.success("Alerta de teste enviado! Verifique o widget no OBS.");
    } catch (error) {
      console.error("Error sending test alert:", error);
      toast.error("Erro ao enviar alerta de teste");
    }
  };

  const handleCreateAlert = async () => {
    if (!streamerId) return;

    // Validate with zod schema
    const priceCents = Math.round(parseFloat(formData.price) * 100);
    
    try {
      const validationData = {
        title: formData.title.trim(),
        description: formData.description,
        price_cents: priceCents
      };
      
      const result = alertSchema.safeParse(validationData);
      if (!result.success) {
        const error = result.error.errors[0];
        toast.error(error.message);
        return;
      }
    } catch (error) {
      toast.error("Erro na validação dos dados");
      return;
    }

    if (!mediaFile && !editingAlert) {
      toast.error("Arquivo de mídia é obrigatório");
      return;
    }

    // Audio requires cover image
    if (formData.mediaType === "audio" && !coverImage && !editingAlert?.thumb_path) {
      toast.error("Imagem de capa obrigatória para alertas de áudio");
      return;
    }

    // Validate thumbnail size for video
    if (thumbnailFile && thumbnailFile.size > 5 * 1024 * 1024) {
      toast.error("Thumbnail muito grande. Tamanho máximo: 5MB");
      return;
    }

    // Check alert limit (only for new alerts)
    if (!editingAlert && alerts.length >= 20) {
      toast.error("Você atingiu o limite de 20 alertas");
      return;
    }

    // Validate file size
    if (mediaFile && mediaFile.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 50MB");
      return;
    }

    // Validate cover image size
    if (coverImage && coverImage.size > 5 * 1024 * 1024) {
      toast.error("Imagem de capa muito grande. Tamanho máximo: 5MB");
      return;
    }

    // Validate file type
    if (mediaFile) {
      const allowedTypes = ["image/", "audio/", "video/"];
      if (!allowedTypes.some((type) => mediaFile.type.startsWith(type))) {
        toast.error("Tipo de arquivo inválido");
        return;
      }
    }

    try {
      setLoading(true);

      let mediaPath = editingAlert?.media_path;
      let thumbPath = editingAlert?.thumb_path;

      // Upload new media file if provided
      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${streamerId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("alerts")
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("alerts").getPublicUrl(fileName);

        mediaPath = publicUrl;
      }

      // Upload cover image for audio or thumbnail for video
      if (coverImage || thumbnailFile) {
        const file = coverImage || thumbnailFile;
        if (!file) return;
        
        const fileExt = file.name.split(".").pop();
        const fileName = `${streamerId}/${coverImage ? 'cover' : 'thumb'}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("alerts")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("alerts").getPublicUrl(fileName);

        thumbPath = publicUrl;
      }

      const alertData = {
        streamer_id: streamerId,
        title: formData.title,
        description: formData.description || null,
        price_cents: priceCents,
        media_type: formData.mediaType,
        media_path: mediaPath,
        thumb_path: thumbPath || null,
        test_mode: false,
      };

      if (editingAlert) {
        // Update existing alert
        const { error: updateError } = await supabase
          .from("alerts")
          .update(alertData)
          .eq("id", editingAlert.id);

        if (updateError) throw updateError;

        toast.success("Alerta atualizado com sucesso!");
      } else {
        // Insert new alert
        const { error: insertError } = await supabase
          .from("alerts")
          .insert(alertData);

        if (insertError) throw insertError;

        toast.success("Alerta criado com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingAlert(null);
      setFormData({ title: "", description: "", price: "", mediaType: "image" });
      setMediaFile(null);
      setCoverImage(null);
      setThumbnailFile(null);
      loadStreamerAndAlerts();
    } catch (error: any) {
      toast.error(editingAlert ? "Erro ao atualizar alerta" : "Erro ao criar alerta");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (alert: any) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      description: alert.description || "",
      price: (alert.price_cents / 100).toString(),
      mediaType: alert.media_type,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (alert: any) => {
    setEditingAlert(null);
    setFormData({
      title: `${alert.title} (Cópia)`,
      description: alert.description || "",
      price: (alert.price_cents / 100).toString(),
      mediaType: alert.media_type,
    });
    setMediaFile(null);
    setCoverImage(null);
    setThumbnailFile(null);
    setIsDialogOpen(true);
    toast.info("Configure o novo arquivo de mídia para completar a duplicação");
  };

  const handleDelete = async (alertId: string) => {
    try {
      setLoading(true);

      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) return;

      // Delete media from storage
      if (alert.media_path) {
        const path = alert.media_path.split("/alerts/")[1];
        if (path) {
          await supabase.storage.from("alerts").remove([path]);
        }
      }

      // Delete thumb from storage
      if (alert.thumb_path) {
        const path = alert.thumb_path.split("/alerts/")[1];
        if (path) {
          await supabase.storage.from("alerts").remove([path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alerta excluído com sucesso!");
      setDeleteAlertId(null);
      loadStreamerAndAlerts();
    } catch (error: any) {
      toast.error("Erro ao excluir alerta");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Gerencie seus alertas de mídia (máximo 20)
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar Novo Alerta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
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
              <Card
                key={alert.id}
                ref={highlightedAlertId === alert.id ? highlightedRef : null}
                className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                  highlightedAlertId === alert.id 
                    ? "ring-2 ring-primary ring-offset-2 animate-pulse" 
                    : ""
                }`}
                onClick={() => setPreviewAlert(alert)}
              >
                {(alert.thumb_path || alert.media_type === "image") && (
                  <img
                    src={alert.thumb_path || alert.media_path}
                    alt={alert.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                {alert.media_type === "video" && !alert.thumb_path && (
                  <div className="relative w-full h-48 bg-muted">
                    <video
                      src={alert.media_path}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                )}
                {alert.media_type === "audio" && !alert.thumb_path && (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{alert.title}</h3>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {alert.description}
                    </p>
                  )}
                    <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-primary">
                      R$ {(alert.price_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-secondary rounded">
                      {alert.media_type}
                    </span>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1 gap-1">
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(alert)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Editar Informações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(alert)}>
                          <Copy className="h-3 w-3 mr-2" />
                          Duplicar Alerta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteAlertId(alert.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Excluir Alerta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => handleTestAlert(alert.id)}
                    >
                      <Play className="h-3 w-3" />
                      Testar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAlert(null);
              setFormData({ title: "", description: "", price: "", mediaType: "image" });
              setMediaFile(null);
              setCoverImage(null);
              setThumbnailFile(null);
              // Clear preview URLs
              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
              if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
              if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
              setImagePreviewUrl(null);
              setCoverPreviewUrl(null);
              setThumbnailPreviewUrl(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAlert ? "Editar Alerta" : "Criar Novo Alerta"}
              </DialogTitle>
              <DialogDescription>
                {editingAlert
                  ? "Atualize as informações do alerta"
                  : "Configure um novo alerta de mídia para seu público"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nome do alerta"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva seu alerta..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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
                  placeholder="5.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="mediaType">Tipo de Mídia *</Label>
                <Select
                  value={formData.mediaType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, mediaType: value })
                  }
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
              {formData.mediaType === "audio" && (
                <div className="space-y-2">
                  <Label htmlFor="cover">Imagem de Capa * (máx. 5MB)</Label>
                  {coverPreviewUrl ? (
                    <div className="relative">
                      <img 
                        src={coverPreviewUrl} 
                        alt="Preview da capa"
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setCoverImage(null);
                          if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                          setCoverPreviewUrl(null);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file, 'cover');
                      }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Obrigatório para alertas de áudio
                  </p>
                </div>
              )}
              {formData.mediaType === "video" && (
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail do Vídeo (opcional, máx. 5MB)</Label>
                  {thumbnailPreviewUrl ? (
                    <div className="relative">
                      <img 
                        src={thumbnailPreviewUrl} 
                        alt="Preview da thumbnail"
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setThumbnailFile(null);
                          if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
                          setThumbnailPreviewUrl(null);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file, 'thumbnail');
                      }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Imagem que aparecerá na galeria antes do vídeo ser reproduzido
                  </p>
                </div>
              )}
              {/* Video Preview */}
              {formData.mediaType === "video" && videoPreviewUrl && (
                <div className="relative">
                  <video 
                    src={videoPreviewUrl} 
                    className="w-full h-32 object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview do vídeo selecionado
                  </p>
                </div>
              )}
              {/* Image Preview */}
              {formData.mediaType === "image" && imagePreviewUrl && (
                <div className="relative">
                  <img 
                    src={imagePreviewUrl} 
                    alt="Preview da imagem"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setMediaFile(null);
                      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                      setImagePreviewUrl(null);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Trocar
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="media">
                  {editingAlert ? "Novo Arquivo (opcional)" : "Arquivo de Mídia *"}{" "}
                  (máx. 50MB)
                </Label>
                {formData.mediaType === "image" && !imagePreviewUrl && (
                  <Input
                    id="media"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(file, 'media');
                    }}
                  />
                )}
                {formData.mediaType === "audio" && (
                  <Input
                    id="media"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                )}
                {formData.mediaType === "video" && (
                  <Input
                    id="media"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingAlert(null);
                  setFormData({
                    title: "",
                    description: "",
                    price: "",
                    mediaType: "image",
                  });
                  setMediaFile(null);
                  setCoverImage(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateAlert} disabled={loading}>
                {loading
                  ? editingAlert
                    ? "Salvando..."
                    : "Criando..."
                  : editingAlert
                  ? "Salvar"
                  : "Criar Alerta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog
          open={!!previewAlert}
          onOpenChange={(open) => !open && setPreviewAlert(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {previewAlert?.title}
              </DialogTitle>
              <DialogDescription>{previewAlert?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {previewAlert?.media_type === "image" && (
                <img
                  src={previewAlert.media_path}
                  alt={previewAlert.title}
                  className="w-full max-h-[500px] object-contain rounded-lg"
                />
              )}
              {previewAlert?.media_type === "video" && (
                <video
                  src={previewAlert.media_path}
                  controls
                  className="w-full max-h-[500px] rounded-lg"
                />
              )}
              {previewAlert?.media_type === "audio" && (
                <div className="space-y-4">
                  {previewAlert.thumb_path && (
                    <img
                      src={previewAlert.thumb_path}
                      alt={previewAlert.title}
                      className="w-full max-h-[300px] object-contain rounded-lg"
                    />
                  )}
                  <audio src={previewAlert.media_path} controls className="w-full" />
                </div>
              )}
                <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <span className="text-2xl font-bold text-primary block">
                    R$ {previewAlert && (previewAlert.price_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-sm px-3 py-1 bg-secondary rounded">
                    {previewAlert?.media_type}
                  </span>
                </div>
                <Button 
                  onClick={() => {
                    if (previewAlert) {
                      handleTestAlert(previewAlert.id);
                      setPreviewAlert(null);
                    }
                  }}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Testar no Widget
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteAlertId}
          onOpenChange={(open) => !open && setDeleteAlertId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este alerta? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAlertId && handleDelete(deleteAlertId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Image Cropper Dialog */}
        <Dialog open={showCropper} onOpenChange={(open) => !open && handleCropCancel()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajustar Imagem</DialogTitle>
              <DialogDescription>
                Arraste para reposicionar e use o zoom para ajustar o enquadramento da imagem
              </DialogDescription>
            </DialogHeader>
            {cropperImageSrc && (
              <ImageCropper
                imageSrc={cropperImageSrc}
                aspectRatio={16 / 9}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
