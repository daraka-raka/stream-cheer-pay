import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streamer, setStreamer] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [imageDuration, setImageDuration] = useState(5);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadStreamerData();
    }
  }, [user]);

  useEffect(() => {
    if (streamer) {
      setDisplayName(streamer.display_name || "");
      setBio(streamer.bio || "");
      setPreviewPhoto(streamer.photo_url || null);
    }
  }, [streamer]);

  useEffect(() => {
    if (settings) {
      setImageDuration(settings.overlay_image_duration_seconds || 5);
    }
  }, [settings]);

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
    if (!streamer || !displayName.trim()) {
      toast.error("Nome de exibição é obrigatório");
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
          theme: theme || "system",
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
                  value={`${window.location.origin}/widget/${streamer?.public_key || "sua-chave"}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/widget/${streamer?.public_key}`,
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

        {/* Preferências */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Preferências</h2>
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
                className="mt-1"
              />
            </div>
            <Button onClick={handleSavePreferences} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
