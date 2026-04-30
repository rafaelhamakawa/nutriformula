import { LogoLoader } from "@/components/logo-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { Pencil, Plus, Search } from "lucide-react";
import iconNutrientes from "@/assets/dashboard/nutrientes.png";

const DEFAULT_NUTRIENTS: Omit<Nutrient, "id">[] = [
  { nome: "Proteína Bruta", unidade: "%", categoria: "Macronutriente", descricao: "" },
  { nome: "Energia Digestível", unidade: "kcal/kg", categoria: "Energia", descricao: "" },
  { nome: "Gordura", unidade: "%", categoria: "Macronutriente", descricao: "" },
  { nome: "Ac. Linoléico", unidade: "%", categoria: "Ácido graxo", descricao: "" },
  { nome: "Amido", unidade: "%", categoria: "Carboidrato", descricao: "" },
  { nome: "Fibra bruta", unidade: "%", categoria: "Fibra", descricao: "" },
  { nome: "FDN", unidade: "%", categoria: "Fibra", descricao: "Fibra em detergente neutro" },
  { nome: "FDA", unidade: "%", categoria: "Fibra", descricao: "Fibra em detergente ácido" },
  { nome: "Lisina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Met. + Cist. Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Treonina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Triptofano Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Isoleucina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Valina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Leucina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Arginina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Fen. + Tir. Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Histidina Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Glutamato Digestível", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Fósforo Digestível", unidade: "%", categoria: "Mineral", descricao: "" },
  { nome: "Cálcio", unidade: "%", categoria: "Mineral", descricao: "" },
  { nome: "Potássio", unidade: "%", categoria: "Mineral", descricao: "" },
  { nome: "Sódio", unidade: "%", categoria: "Mineral", descricao: "" },
  { nome: "Cloro", unidade: "%", categoria: "Mineral", descricao: "" },
  { nome: "Glutamina", unidade: "%", categoria: "Aminoácido", descricao: "" },
  { nome: "Alanina", unidade: "%", categoria: "Aminoácido", descricao: "" },
];

export const Route = createFileRoute("/nutrientes")({
  head: () => ({ meta: [{ title: "Nutrientes — NutriForm" }] }),
  component: NutrientesPage,
});

interface Nutrient {
  id: string;
  nome: string;
  unidade: string;
  categoria: string;
  descricao: string;
}

const empty = (): Omit<Nutrient, "id"> => ({
  nome: "",
  unidade: "",
  categoria: "",
  descricao: "",
});

function NutrientesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useSupabaseCollection<Nutrient, Nutrient & { user_id: string }>(
    "nutrients",
    (it) => ({
      nome: it.nome,
      unidade: it.unidade,
      categoria: it.categoria,
      descricao: it.descricao,
    }),
    (row) => ({
      id: row.id,
      nome: row.nome,
      unidade: row.unidade ?? "",
      categoria: row.categoria ?? "",
      descricao: row.descricao ?? "",
    }),
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Nutrient | null>(null);
  const [form, setForm] = useState<Omit<Nutrient, "id">>(empty);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (items.length === 0) {
      setItems(DEFAULT_NUTRIENTS.map((n) => ({ id: crypto.randomUUID(), ...n })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.nome.toLowerCase().includes(search.toLowerCase()) ||
          i.categoria.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  if (loading || !user) {
    return <LogoLoader />;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (it: Nutrient) => {
    setEditing(it);
    const { id: _id, ...rest } = it;
    setForm(rest);
    setOpen(true);
  };

  const save = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do nutriente.");
      return;
    }
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...editing, ...form } : i)));
      toast.success("Nutriente atualizado.");
    } else {
      setItems([...items, { id: crypto.randomUUID(), ...form }]);
      toast.success("Nutriente criado.");
    }
    setOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <PageHeader
          icon={iconNutrientes}
          title="Nutrientes"
          description="Cadastre e edite nutrientes utilizados nas formulações."
        />

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50 mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nutriente..."
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Novo
            </Button>
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Nenhum nutriente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.nome}</TableCell>
                      <TableCell>{it.unidade || "—"}</TableCell>
                      <TableCell>{it.categoria || "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {it.descricao || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar nutriente" : "Novo nutriente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unidade">Unidade</Label>
                <Input
                  id="unidade"
                  placeholder="%, kcal/kg, mg/kg..."
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  placeholder="Macronutriente, Mineral..."
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  maxLength={50}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
