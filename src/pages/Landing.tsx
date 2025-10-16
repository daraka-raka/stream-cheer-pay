import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, DollarSign, Play } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Streala
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button variant="hero">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in">
            Monetize suas Lives com Alertas Multimídia
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crie alertas personalizados com imagem, áudio e vídeo. Seu público compra, você recebe, e os alertas aparecem automaticamente na sua stream.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" variant="hero" className="text-lg px-8 py-6">
                Começar Agora
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/streamers">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Encontrar Streamers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-4xl font-bold text-center mb-16">Como Funciona</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-6 shadow-glow">
              <Play className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">1. Crie seus Alertas</h4>
            <p className="text-muted-foreground">
              Faça upload de até 20 alertas com imagem, áudio ou vídeo. Defina título, descrição e preço em reais.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-6 shadow-glow">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">2. Público Compra</h4>
            <p className="text-muted-foreground">
              Espectadores acessam sua página pública, escolhem um alerta e pagam via QR Code (Pix ou Cartão).
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 shadow-glow">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">3. Alertas Aparecem</h4>
            <p className="text-muted-foreground">
              Após o pagamento, o alerta entra na fila e é exibido automaticamente no seu OBS/stream.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20">
          <h3 className="text-4xl font-bold mb-6">Pronto para Começar?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Crie sua conta gratuitamente e comece a monetizar suas lives hoje mesmo.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" variant="hero" className="text-lg px-12 py-6">
              Criar Conta de Streamer
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Streala. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
