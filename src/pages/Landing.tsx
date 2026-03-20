import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, DollarSign, Play, Shield, ArrowRight } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Streala</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight text-wrap-balance">
            Alertas pagos na sua live. Simples assim.
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto text-wrap-pretty">
            Seus viewers escolhem um alerta, pagam via Pix, e o conteúdo aparece na stream. Você recebe direto no Mercado Pago.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Começar Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works — timeline vertical */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-16">Como funciona</h3>
          <div className="max-w-2xl mx-auto space-y-12">
            {[
              {
                step: "01",
                icon: Play,
                title: "Crie seus alertas",
                desc: "Faça upload de vídeos, imagens ou áudios. Defina título, descrição e preço em reais.",
              },
              {
                step: "02",
                icon: DollarSign,
                title: "Viewers compram",
                desc: "Eles acessam sua página pública, escolhem o alerta e pagam na hora via Pix ou cartão.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Alerta toca na live",
                desc: "Pagamento confirmado, o alerta entra na fila e aparece automaticamente no OBS.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passo {item.step}</span>
                  <h4 className="text-lg font-semibold mt-1 mb-2">{item.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — 2 column asymmetric */}
      <section className="container mx-auto px-4 py-20 md:py-24">
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-16">Por que usar o Streala</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="p-6 rounded-lg border border-border bg-card">
            <Shield className="h-5 w-5 text-accent mb-4" />
            <h4 className="font-semibold mb-2">Pagamento seguro</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Receba direto na sua conta do Mercado Pago. Sem intermediários, sem atrasos.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Zap className="h-5 w-5 text-accent mb-4" />
            <h4 className="font-semibold mb-2">Fila automática</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gerencie a ordem de exibição e modere o conteúdo da sua live com total controle.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card md:col-span-2">
            <DollarSign className="h-5 w-5 text-accent mb-4" />
            <h4 className="font-semibold mb-2">Taxas baixas</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nossas taxas de comissão são as mais baixas do mercado. A maior parte vai para o seu bolso.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold">Pronto para começar?</h3>
            <p className="text-muted-foreground">
              Crie sua conta gratuitamente e comece a monetizar sua live hoje.
            </p>
            <Link to="/auth/signup">
              <Button size="lg" className="px-10">
                Criar Minha Conta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Streala. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
