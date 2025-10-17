import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [streamer, setStreamer] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  // TODO: Implementar queries Supabase

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
            <div>
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                placeholder="Seu nome"
                defaultValue={streamer?.display_name}
              />
            </div>
            <div>
              <Label htmlFor="handle">Handle Único</Label>
              <Input
                id="handle"
                placeholder="seu-handle"
                defaultValue={streamer?.handle}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Seu handle aparece na URL da sua página pública
              </p>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Conte um pouco sobre você..."
                defaultValue={streamer?.bio}
                rows={3}
              />
            </div>
            <Button>Salvar Perfil</Button>
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
                  value={`${window.location.origin}/${streamer?.handle || "seu-handle"}`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/${streamer?.handle}`,
                      "Link da página"
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Widget URL (para OBS)</Label>
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
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cole esta URL no OBS como Browser Source
              </p>
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
                defaultValue={settings?.overlay_image_duration_seconds || 5}
                className="mt-1"
              />
            </div>
            <Button>Salvar Preferências</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
