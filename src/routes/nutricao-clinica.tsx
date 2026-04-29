import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/nutricao-clinica")({
  head: () => ({ meta: [{ title: "Nutrição Clínica — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={HeartPulse}
      title="Nutrição Clínica"
      description="Em breve: planos clínicos para diferentes condições de saúde."
    />
  ),
});
