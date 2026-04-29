import { LogoLoader } from "@/components/logo-loader";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import logo from "@/assets/logo.png";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PlaceholderPage({ icon: Icon, title, description }: PlaceholderPageProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="NutriForm" className="h-9 w-9" />
            <span className="text-lg font-bold">NutriForm</span>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <Card className="max-w-2xl mx-auto p-10 text-center bg-card/60 backdrop-blur border-border/50">
          <div
            className="h-20 w-20 mx-auto rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Icon className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground text-lg">{description}</p>
        </Card>
      </main>
    </div>
  );
}
