import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/formular-racao")({
  head: () => ({ meta: [{ title: "Formular Ração — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={Calculator}
      title="Formular Ração"
      description="Em breve: criação de formulações balanceadas com cálculo automático."
    />
  ),
});
