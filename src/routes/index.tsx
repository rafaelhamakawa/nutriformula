import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Beaker, Calculator, HeartPulse, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriForm — Formulação de Ração e Nutrição Clínica" },
      { name: "description", content: "Plataforma moderna para formulação de ração animal e nutrição clínica. Cálculos precisos, rápidos e profissionais." },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: Calculator, title: "Formulação Precisa", desc: "Cálculo otimizado de rações balanceadas com base em requisitos nutricionais." },
  { icon: HeartPulse, title: "Nutrição Clínica", desc: "Planos nutricionais clínicos personalizados para diferentes condições." },
  { icon: Beaker, title: "Banco de Ingredientes", desc: "Catálogo completo de ingredientes com composição nutricional detalhada." },
  { icon: LineChart, title: "Análise & Relatórios", desc: "Visualize resultados, custos e indicadores nutricionais em tempo real." },
  { icon: ShieldCheck, title: "Dados Seguros", desc: "Suas formulações protegidas com autenticação e armazenamento seguro." },
  { icon: Sparkles, title: "Interface Moderna", desc: "Experiência rápida, responsiva e intuitiva em qualquer dispositivo." },
];

function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="NutriForm logo" className="h-10 w-10" />
          <span className="text-xl font-bold text-foreground">NutriForm</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/signup"><Button>Cadastrar</Button></Link>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-6 py-16 md:py-24 text-center">
          <img
            src={logo}
            alt="NutriForm"
            className="mx-auto h-40 w-40 md:h-56 md:w-56 mb-8"
            style={{ filter: "drop-shadow(var(--shadow-glow))" }}
          />
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              NutriForm
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            A plataforma completa para formulação de ração e nutrição clínica.
            Precisão profissional ao alcance de um clique.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="text-base" style={{ boxShadow: "var(--shadow-elegant)" }}>
                Começar agora
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Funcionalidades</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Tudo o que você precisa para criar formulações eficientes e planos nutricionais profissionais.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 bg-card/60 backdrop-blur border-border/50 hover:border-primary/50 transition-all">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NutriForm. Todos os direitos reservados.
      </footer>
    </div>
  );
}
