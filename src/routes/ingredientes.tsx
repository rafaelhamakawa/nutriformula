import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Beaker } from "lucide-react";

export const Route = createFileRoute("/ingredientes")({
  head: () => ({ meta: [{ title: "Ingredientes — NutriForm" }] }),
  component: () => (
    <PlaceholderPage
      icon={Beaker}
      title="Ingredientes"
      description="Em breve: catálogo completo de ingredientes."
    />
  ),
});
