import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Atom } from "lucide-react";

export const Route = createFileRoute("/nutrientes")({
  head: () => ({ meta: [{ title: "Nutrientes — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={Atom}
      title="Nutrientes"
      description="Em breve: tabela de nutrientes e composição."
    />
  ),
});
