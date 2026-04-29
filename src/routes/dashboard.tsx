import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Calculator, HeartPulse, Beaker, LineChart } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NutriForm" }] }),
  component: DashboardPage,
});

const cards = [
  { icon: Calculator, title: "Nova Formulação", desc: "Crie uma nova formulação de ração balanceada." },
  { icon: HeartPulse, title: "Plano Clínico", desc: "Monte um plano de nutrição clínica." },
  { icon: Beaker, title: "Ingredientes", desc: "Gerencie seu banco de ingredientes." },
  { icon: LineChart, title: "Relatórios", desc: "Visualize análises e indicadores." },
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

      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Olá, {(user.user_metadata?.full_name as string) ?? "bem-vindo"}!
        </h1>
        <p className="text-muted-foreground mb-8">O que você quer fazer hoje?</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-6 bg-card/60 backdrop-blur border-border/50 hover:border-primary/50 transition-all cursor-pointer">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
                <Icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
