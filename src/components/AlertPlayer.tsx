import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AlertPlayerProps {
  alert: {
    id: string;
    title: string;
    media_type: string;
    media_path: string;
    thumb_path?: string;
  };
  buyerNote?: string;
  duration: number;
  onComplete: () => void;
}

export const AlertPlayer = ({ alert, buyerNote, duration, onComplete }: AlertPlayerProps) => {
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // media_path já contém a URL pública completa do arquivo
    // O bucket 'alerts' é público, então não precisa de signed URLs
    setMediaUrl(alert.media_path);
    
    if (alert.thumb_path) {
      setThumbUrl(alert.thumb_path);
    }
  }, [alert]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (alert.media_type === "audio" && audioRef.current) {
      audioRef.current.play().catch(console.error);
      audioRef.current.onended = () => {
        timer = setTimeout(onComplete, duration * 1000);
      };
    } else if (alert.media_type === "video" && videoRef.current) {
      videoRef.current.play().catch(console.error);
      videoRef.current.onended = onComplete;
    } else if (alert.media_type === "image") {
      timer = setTimeout(onComplete, duration * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mediaUrl, alert.media_type, duration, onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-2xl mx-auto p-8">
        {/* Media Display */}
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden">
          {alert.media_type === "audio" && (
            <div className="relative">
              {thumbUrl && (
                <img
                  src={thumbUrl}
                  alt={alert.title}
                  className="w-full h-96 object-cover"
                />
              )}
              <audio ref={audioRef} src={mediaUrl} className="hidden" />
            </div>
          )}

          {alert.media_type === "video" && (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-auto max-h-[80vh]"
              playsInline
            />
          )}

          {alert.media_type === "image" && (
            <img
              src={mediaUrl}
              alt={alert.title}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}

          {/* Message Overlay */}
          {buyerNote && (
            <div className="p-6 bg-gradient-to-t from-background to-transparent">
              <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "500ms" }}>
                <p className="text-2xl font-bold text-foreground">{alert.title}</p>
                <p className="text-lg text-muted-foreground italic">"{buyerNote}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
