import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function MercadoPagoCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      // Check for OAuth error
      if (error) {
        setStatus("error");
        setErrorMessage("Autorização negada pelo usuário");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("Código de autorização não encontrado");
        return;
      }

      // Decode state to get streamer_id
      let streamerId: string;
      try {
        const stateData = JSON.parse(atob(state || ""));
        streamerId = stateData.streamer_id;
        if (!streamerId) throw new Error("streamer_id missing");
      } catch {
        setStatus("error");
        setErrorMessage("Estado de sessão inválido. Tente novamente.");
        return;
      }

      try {
        // Call edge function to exchange code for tokens
        const { data, error: invokeError } = await supabase.functions.invoke("mp-exchange-token", {
          body: { 
            code, 
            streamer_id: streamerId,
            redirect_uri: `${window.location.origin}/auth/callback/mercadopago`
          },
        });

        if (invokeError) {
          console.error("Edge function error:", invokeError);
          setStatus("error");
          setErrorMessage(invokeError.message || "Erro ao conectar conta");
          return;
        }

        if (data?.error) {
          console.error("OAuth error:", data.error);
          setStatus("error");
          setErrorMessage(data.error);
          return;
        }

        setStatus("success");
        setTimeout(() => navigate("/settings?mp=connected"), 2000);
      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("error");
        setErrorMessage("Erro inesperado. Tente novamente.");
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
            <h1 className="mt-6 text-2xl font-semibold">Conectando sua conta...</h1>
            <p className="mt-2 text-muted-foreground">
              Aguarde enquanto configuramos seu recebimento
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="mt-6 text-2xl font-semibold text-green-500">
              Conta conectada com sucesso!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Redirecionando para configurações...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="mt-6 text-2xl font-semibold">Erro ao conectar</h1>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
            <Button className="mt-6" onClick={() => navigate("/settings")}>
              Voltar para Configurações
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
