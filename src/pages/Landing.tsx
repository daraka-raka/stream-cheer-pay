import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, DollarSign, Play, Users, Sparkles, MonitorPlay, Shield, ListOrdered, Percent } from "lucide-react";

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
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Column - Text */}
          <div className="space-y-8 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in leading-tight">
              Transforme sua Live em um Espetáculo Interativo
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Deixe seus seguidores participarem da sua stream com alertas únicos de vídeo e áudio. Monetize sua paixão de forma simples e divertida.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/auth/signup">
                <Button size="lg" variant="hero" className="text-lg px-8 py-6 w-full sm:w-auto">
                  Começar Agora (Grátis)
                  <Zap className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 w-full sm:w-auto">
                  Entrar na Plataforma
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Mais de 500 Streamers já usam Streala para engajar e monetizar.</span>
            </div>
          </div>

          {/* Right Column - Product Visual */}
          <div className="relative order-first lg:order-last">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-gradient-to-br from-card to-muted">
              {/* Mock Dashboard Preview */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Mock Header */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-foreground/20 rounded" />
                    <div className="h-3 w-16 bg-foreground/10 rounded mt-1" />
                  </div>
                </div>

                {/* Mock Alert Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-background/80 p-3 space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                    <div className="h-3 w-full bg-foreground/10 rounded" />
                    <div className="h-4 w-16 bg-primary/30 rounded text-center text-xs text-primary font-bold flex items-center justify-center">
                      R$ 5,00
                    </div>
                  </div>
                  <div className="rounded-xl bg-background/80 p-3 space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                      <MonitorPlay className="h-8 w-8 text-secondary" />
                    </div>
                    <div className="h-3 w-full bg-foreground/10 rounded" />
                    <div className="h-4 w-16 bg-secondary/30 rounded text-center text-xs text-secondary font-bold flex items-center justify-center">
                      R$ 10,00
                    </div>
                  </div>
                </div>

                {/* Mock Alert Playing Indicator */}
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-4 border border-primary/20 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary animate-pulse" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Alerta tocando na stream!</p>
                      <p className="text-xs text-muted-foreground">Enviado por @viewer123</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-2xl -z-10" />
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 h-20 w-20 bg-gradient-to-br from-primary to-primary-glow rounded-2xl shadow-glow rotate-12 flex items-center justify-center animate-fade-in hidden md:flex" style={{ animationDelay: "0.4s" }}>
              <DollarSign className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-4 -left-4 h-16 w-16 bg-gradient-to-br from-secondary to-accent rounded-2xl shadow-glow -rotate-12 flex items-center justify-center animate-fade-in hidden md:flex" style={{ animationDelay: "0.5s" }}>
              <Play className="h-8 w-8 text-white" />
            </div>
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
            <h4 className="text-xl font-bold mb-4">1. Crie a Interação</h4>
            <p className="text-muted-foreground">
              Faça o upload de vídeos, imagens e áudios que farão sua live explodir. Defina o título, a descrição e o preço em Reais.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-6 shadow-glow">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">2. Público Engajado</h4>
            <p className="text-muted-foreground">
              Seus espectadores acessam sua página pública, escolhem o alerta e pagam instantaneamente via Pix ou Cartão.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 shadow-glow">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">3. Reação Imediata</h4>
            <p className="text-muted-foreground">
              Após a confirmação do pagamento, o alerta entra na fila e é exibido automaticamente no seu OBS/Stream. Engajamento garantido!
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-4xl font-bold text-center mb-16">Por Que Streamers de Sucesso Escolhem o Streala?</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6 shadow-glow">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">Pagamento Seguro e Instantâneo</h4>
            <p className="text-muted-foreground">
              Receba seus valores diretamente na sua conta do Mercado Pago. Sem intermediários, sem atrasos.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-glow">
              <ListOrdered className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">Moderação e Fila de Alertas</h4>
            <p className="text-muted-foreground">
              Gerencie a ordem de exibição e modere o conteúdo para manter sua live sempre profissional.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border hover:shadow-glow transition-all duration-300">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-glow">
              <Percent className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-bold mb-4">A Menor Taxa do Mercado</h4>
            <p className="text-muted-foreground">
              Nossas taxas de comissão são as mais baixas, garantindo que a maior parte do seu esforço vá para o seu bolso.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20">
          <h3 className="text-4xl font-bold mb-6">Pronto para Levar sua Live ao Próximo Nível?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Crie sua conta gratuitamente e comece a monetizar e engajar seus seguidores hoje mesmo.
          </p>
          <Link to="/auth/signup">
            <Button size="lg" variant="hero" className="text-lg px-12 py-6">
              Criar Minha Conta de Streamer
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Streala. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
