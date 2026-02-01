import { useEffect, useRef, useState } from "react";

interface AlertPlayerProps {
  alert: {
    id: string;
    title: string;
    media_type: string;
    media_path: string;
    thumb_path?: string;
  };
  buyerName?: string;
  buyerNote?: string;
  duration: number;
  onComplete: () => void;
}

export const AlertPlayer = ({ alert, buyerName, buyerNote, duration, onComplete }: AlertPlayerProps) => {
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // media_path já contém a URL pública completa do arquivo
    setMediaUrl(alert.media_path);
    
    if (alert.thumb_path) {
      setThumbUrl(alert.thumb_path);
    }

    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [alert]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleComplete = () => {
      // Trigger exit animation
      setIsVisible(false);
      timer = setTimeout(onComplete, 300); // Wait for exit animation
    };

    if (alert.media_type === "audio" && audioRef.current) {
      audioRef.current.play().catch(console.error);
      audioRef.current.onended = () => {
        timer = setTimeout(handleComplete, duration * 1000);
      };
    } else if (alert.media_type === "video" && videoRef.current) {
      videoRef.current.play().catch(console.error);
      videoRef.current.onended = handleComplete;
    } else if (alert.media_type === "image") {
      timer = setTimeout(handleComplete, duration * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mediaUrl, alert.media_type, duration, onComplete]);

  // Estilo de texto com sombra para legibilidade em qualquer fundo
  const textShadowStyle = {
    textShadow: "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.6)",
  };

  return (
    <div 
      className={`flex flex-col items-center gap-4 transition-all duration-300 ease-out ${
        isVisible 
          ? "opacity-100 scale-100" 
          : "opacity-0 scale-95"
      }`}
    >
      {/* Media Display - sem background */}
      <div className="relative">
        {alert.media_type === "audio" && (
          <div className="relative">
            {thumbUrl && (
              <img
                src={thumbUrl}
                alt={alert.title}
                className="max-w-md max-h-80 object-contain rounded-lg shadow-2xl"
              />
            )}
            <audio ref={audioRef} src={mediaUrl} className="hidden" />
          </div>
        )}

        {alert.media_type === "video" && (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-2xl max-h-[60vh] rounded-lg shadow-2xl"
            playsInline
          />
        )}

        {alert.media_type === "image" && (
          <img
            src={mediaUrl}
            alt={alert.title}
            className="max-w-2xl max-h-[60vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Texto com sombra - legível em qualquer fundo */}
      <div className="text-center space-y-2">
        {/* Título do alerta */}
        <p 
          className="text-3xl font-bold text-white"
          style={textShadowStyle}
        >
          {alert.title}
        </p>

        {/* Nome de quem comprou */}
        {buyerName && (
          <p 
            className="text-xl font-semibold text-white"
            style={textShadowStyle}
          >
            {buyerName}
          </p>
        )}

        {/* Mensagem do comprador */}
        {buyerNote && (
          <p 
            className="text-lg text-white/90 italic max-w-lg"
            style={textShadowStyle}
          >
            "{buyerNote}"
          </p>
        )}
      </div>
    </div>
  );
};
