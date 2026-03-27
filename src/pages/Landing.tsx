import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DollarSign, Play, Shield, ArrowRight, Zap } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.05)] sticky top-0 z-50 bg-[#0f0f11]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[rgba(167,139,250,0.5)]">⚡</span>
            <h1 className="font-display text-[17px] font-extrabold text-[rgba(221,217,208,0.3)]">
              Streala
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm" className="font-body font-normal text-muted-foreground hover:text-foreground">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="font-body font-medium">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 sm:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-[480px]">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-[1px] bg-[rgba(167,139,250,0.4)]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-[rgba(167,139,250,0.4)] font-body">
              Monetize sua live
            </span>
          </div>

          <h2 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white mb-5">
            Apareça{" "}
            <em className="font-body font-light italic text-[rgba(221,217,208,0.4)] not-italic" style={{ fontStyle: 'italic' }}>
              na live.
            </em>
          </h2>
          <p className="font-body font-light text-sm text-[rgba(221,217,208,0.38)] leading-relaxed max-w-md mb-8">
            Seus viewers escolhem um alerta, pagam via Pix, e o conteúdo aparece na stream. Você recebe direto no Mercado Pago.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto px-8 font-body font-medium">
                Começar Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 font-body font-normal">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-[rgba(255,255,255,0.04)]">
        <div className="container mx-auto px-4 sm:px-8 py-20 md:py-24">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-center mb-16">Como funciona</h3>
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
                desc: "Eles acessam sua página pública, escolhem o alerta e pagam na hora via Pix.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Alerta toca na live",
                desc: "Pagamento confirmado, o alerta entra na fila e aparece automaticamente no OBS.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.1)] flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-body uppercase tracking-[0.18em] text-muted-foreground">Passo {item.step}</span>
                  <h4 className="font-display text-lg font-bold mt-1 mb-2">{item.title}</h4>
                  <p className="font-body font-light text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-8 py-20 md:py-24">
        <h3 className="font-display text-2xl md:text-3xl font-bold text-center mb-16">Por que usar o Streala</h3>
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Shield, title: "Pagamento seguro", desc: "Receba direto na sua conta do Mercado Pago. Sem intermediários, sem atrasos." },
            { icon: Zap, title: "Fila automática", desc: "Gerencie a ordem de exibição e modere o conteúdo da sua live com total controle." },
          ].map((f, i) => (
            <div key={i} className="card-shimmer p-6 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(167,139,250,0.03)] hover:border-[rgba(167,139,250,0.2)] transition-all duration-300 hover:-translate-y-[3px]">
              <f.icon className="h-5 w-5 text-primary mb-4" />
              <h4 className="font-display font-bold mb-2">{f.title}</h4>
              <p className="font-body font-light text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
          <div className="md:col-span-2 card-shimmer p-6 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(167,139,250,0.03)] hover:border-[rgba(167,139,250,0.2)] transition-all duration-300 hover:-translate-y-[3px]">
            <DollarSign className="h-5 w-5 text-primary mb-4" />
            <h4 className="font-display font-bold mb-2">Taxas baixas</h4>
            <p className="font-body font-light text-sm text-muted-foreground leading-relaxed">
              Nossas taxas de comissão são as mais baixas do mercado. A maior parte vai para o seu bolso.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[rgba(255,255,255,0.04)]">
        <div className="container mx-auto px-4 sm:px-8 py-20 md:py-24">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h3 className="font-display text-2xl md:text-3xl font-bold">Pronto para começar?</h3>
            <p className="font-body font-light text-muted-foreground">
              Crie sua conta gratuitamente e comece a monetizar sua live hoje.
            </p>
            <Link to="/auth/signup">
              <Button size="lg" className="px-10 font-body font-medium">
                Criar Minha Conta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] py-8">
        <div className="container mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-body">
          <p className="text-[rgba(221,217,208,0.22)]">&copy; {new Date().getFullYear()} Streala. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
