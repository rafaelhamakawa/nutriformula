import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/alimentacao-natural")({
  head: () => ({ meta: [{ title: "Alimentação Natural — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={Leaf}
      title="Alimentação Natural"
      description="Em breve: planos de alimentação natural personalizados."
    />
  ),
});
