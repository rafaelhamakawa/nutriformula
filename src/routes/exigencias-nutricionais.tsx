import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Target } from "lucide-react";

export const Route = createFileRoute("/exigencias-nutricionais")({
  head: () => ({ meta: [{ title: "Exigências Nutricionais — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={Target}
      title="Exigências Nutricionais"
      description="Em breve: requisitos nutricionais por espécie e fase."
    />
  ),
});
