import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Calculator, Leaf, HeartPulse, Beaker, Atom, Target, type LucideIcon } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NutriForm" }] }),
  component: DashboardPage,
});

const cards: { icon: LucideIcon; title: string; desc: string; to: string }[] = [
  { icon: Calculator, title: "Formular Ração", desc: "Crie formulações balanceadas.", to: "/formular-racao" },
  { icon: Leaf, title: "Alimentação Natural", desc: "Planos de alimentação natural.", to: "/alimentacao-natural" },
  { icon: HeartPulse, title: "Nutrição Clínica", desc: "Planos clínicos personalizados.", to: "/nutricao-clinica" },
  { icon: Beaker, title: "Ingredientes", desc: "Catálogo de ingredientes.", to: "/ingredientes" },
  { icon: Atom, title: "Nutrientes", desc: "Tabela de nutrientes.", to: "/nutrientes" },
  { icon: Target, title: "Exigências Nutricionais", desc: "Requisitos por espécie e fase.", to: "/exigencias-nutricionais" },
];

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="NutriForm" className="h-9 w-9" />
            <span className="text-lg font-bold">NutriForm</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Olá, {(user.user_metadata?.full_name as string) ?? "bem-vindo"}!
        </h1>
        <p className="text-muted-foreground mb-10">O que você quer fazer hoje?</p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, title, desc, to }) => (
            <Link key={to} to={to} className="group">
              <Card className="h-full p-8 bg-card/60 backdrop-blur border-border/50 hover:border-primary/60 hover:bg-card/80 transition-all cursor-pointer group-hover:-translate-y-1 group-hover:shadow-2xl"
                style={{ minHeight: "200px" }}
              >
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <Icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
