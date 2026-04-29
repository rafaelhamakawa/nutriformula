import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function AppHeader() {
  return (
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
  );
}
