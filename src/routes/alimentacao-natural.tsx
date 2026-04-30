import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import iconNatural from "@/assets/dashboard/natural.png";

export const Route = createFileRoute("/alimentacao-natural")({
  head: () => ({ meta: [{ title: "Alimentação Natural — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      image={iconNatural}
      title="Alimentação Natural"
      description="Em breve: planos de alimentação natural personalizados."
    />
  ),
});
