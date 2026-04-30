import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import iconExigencias from "@/assets/dashboard/exigencias.png";

export const Route = createFileRoute("/exigencias-nutricionais")({
  head: () => ({ meta: [{ title: "Exigências Nutricionais — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      image={iconExigencias}
      title="Exigências Nutricionais"
      description="Em breve: requisitos nutricionais por espécie e fase."
    />
  ),
});
