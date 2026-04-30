import { LogoLoader } from "@/components/logo-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { PageHeader } from "@/components/page-header";
import iconNatural from "@/assets/dashboard/natural.png";
import { Pencil, Plus, Search, Sprout, Trash2 } from "lucide-react";
import seedData from "@/data/natural-foods-seed.json";

export const Route = createFileRoute("/alimentacao-natural")({
  head: () => ({ meta: [{ title: "Alimentação Natural — NutriForm" }] }),
  component: AlimentacaoNaturalPage,
});

const NUTRIENT_COLUMNS = [
  { key: "proteina_bruta", label: "Proteína Bruta", unit: "%" },
  { key: "energia_digestivel", label: "Energia Digestível", unit: "kcal/100g" },
  { key: "gordura", label: "Gordura", unit: "%" },
  { key: "ac_linoleico", label: "Ac. Linoléico", unit: "%" },
  { key: "amido", label: "Amido", unit: "%" },
  { key: "fibra_bruta", label: "Fibra bruta", unit: "%" },
  { key: "fdn", label: "FDN", unit: "%" },
  { key: "fda", label: "FDA", unit: "%" },
  { key: "lisina_dig", label: "Lisina Dig.", unit: "%" },
  { key: "met_cist_dig", label: "Met.+Cist. Dig.", unit: "%" },
  { key: "treonina_dig", label: "Treonina Dig.", unit: "%" },
  { key: "triptofano_dig", label: "Triptofano Dig.", unit: "%" },
  { key: "isoleucina_dig", label: "Isoleucina Dig.", unit: "%" },
  { key: "valina_dig", label: "Valina Dig.", unit: "%" },
  { key: "leucina_dig", label: "Leucina Dig.", unit: "%" },
  { key: "arginina_dig", label: "Arginina Dig.", unit: "%" },
  { key: "fen_tir_dig", label: "Fen.+Tir. Dig.", unit: "%" },
  { key: "histidina_dig", label: "Histidina Dig.", unit: "%" },
  { key: "glutamato_dig", label: "Glutamato Dig.", unit: "%" },
  { key: "fosforo_dig", label: "Fósforo Dig.", unit: "%" },
  { key: "calcio", label: "Cálcio", unit: "%" },
  { key: "potassio", label: "Potássio", unit: "%" },
  { key: "sodio", label: "Sódio", unit: "%" },
  { key: "cloro", label: "Cloro", unit: "%" },
  { key: "glutamina", label: "Glutamina", unit: "%" },
  { key: "alanina", label: "Alanina", unit: "%" },
  { key: "vit_a", label: "Vitamina A", unit: "UI" },
  { key: "vit_d", label: "Vitamina D", unit: "UI" },
  { key: "vit_e", label: "Vitamina E", unit: "mg" },
  { key: "vit_b12", label: "Vitamina B12", unit: "µg" },
] as const;

type NutrientKey = typeof NUTRIENT_COLUMNS[number]["key"];

const CATEGORIAS = ["carne", "visceras", "ovo", "vegetal", "carboidrato", "fruta", "outro"] as const;
const ORIGENS = ["animal", "vegetal"] as const;

interface NaturalFood {
  id: string;
  nome: string;
  categoria: string;
  origem: string;
  nutrientes: Record<NutrientKey, number>;
}

const emptyNutrients = (): Record<NutrientKey, number> =>
  NUTRIENT_COLUMNS.reduce((acc, c) => {
    acc[c.key] = 0;
    return acc;
  }, {} as Record<NutrientKey, number>);

const emptyForm = (): Omit<NaturalFood, "id"> => ({
  nome: "",
  categoria: "carne",
  origem: "animal",
  nutrientes: emptyNutrients(),
});

function AlimentacaoNaturalPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems, { loading: itemsLoading }] = useSupabaseCollection<
    NaturalFood,
    {
      id: string;
      user_id: string;
      nome: string;
      categoria: string | null;
      origem: string | null;
      nutrientes: Record<string, number> | null;
    }
  >(
    "natural_foods",
    (it) => ({
      nome: it.nome,
      categoria: it.categoria,
      origem: it.origem,
      nutrientes: it.nutrientes,
    }),
    (row) => {
      const base = emptyNutrients();
      const incoming = row.nutrientes ?? {};
      for (const c of NUTRIENT_COLUMNS) {
        const v = Number((incoming as Record<string, unknown>)[c.key]);
        base[c.key] = Number.isFinite(v) ? v : 0;
      }
      return {
        id: row.id,
        nome: row.nome,
        categoria: row.categoria ?? "outro",
        origem: row.origem ?? "animal",
        nutrientes: base,
      };
    },
  );

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NaturalFood | null>(null);
  const [form, setForm] = useState<Omit<NaturalFood, "id">>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.nome.toLowerCase().includes(search.toLowerCase()) &&
          (filterCat === "all" || i.categoria === filterCat),
      ),
    [items, search, filterCat],
  );

  if (loading || !user) return <LogoLoader />;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (it: NaturalFood) => {
    setEditing(it);
    setForm({
      nome: it.nome,
      categoria: it.categoria,
      origem: it.origem,
      nutrientes: { ...it.nutrientes },
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do alimento.");
      return;
    }
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...editing, ...form } : i)));
      toast.success("Alimento atualizado.");
    } else {
      setItems([...items, { id: crypto.randomUUID(), ...form }]);
      toast.success("Alimento criado.");
    }
    setOpen(false);
  };

  const remove = () => {
    if (!deleteId) return;
    setItems(items.filter((i) => i.id !== deleteId));
    setDeleteId(null);
    toast.success("Alimento excluído.");
  };

  const populateSeed = () => {
    const existingNames = new Set(items.map((i) => i.nome.toLowerCase()));
    const toAdd: NaturalFood[] = (seedData as Omit<NaturalFood, "id">[])
      .filter((s) => !existingNames.has(s.nome.toLowerCase()))
      .map((s) => {
        const base = emptyNutrients();
        for (const c of NUTRIENT_COLUMNS) {
          const v = Number((s.nutrientes as Record<string, unknown>)[c.key]);
          base[c.key] = Number.isFinite(v) ? v : 0;
        }
        return {
          id: crypto.randomUUID(),
          nome: s.nome,
          categoria: s.categoria,
          origem: s.origem,
          nutrientes: base,
        };
      });
    if (toAdd.length === 0) {
      toast.info("Todos os alimentos da base já estão cadastrados.");
      return;
    }
    setItems([...items, ...toAdd]);
    toast.success(`${toAdd.length} alimento(s) importado(s) da base.`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <PageHeader
          icon={iconNatural}
          title="Alimentação Natural"
          description="Cadastre alimentos in natura com sua composição completa."
        />

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50 mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar alimento..."
                className="pl-9"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={populateSeed} disabled={itemsLoading}>
                <Sprout className="h-4 w-4 mr-2" /> Popular base
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Novo
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[220px]">Nome</TableHead>
                  <TableHead className="whitespace-nowrap">Categoria</TableHead>
                  <TableHead className="whitespace-nowrap">Origem</TableHead>
                  {NUTRIENT_COLUMNS.map((c) => (
                    <TableHead key={c.key} className="text-right whitespace-nowrap">
                      {c.label}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {c.unit}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right sticky right-0 bg-card z-10">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={NUTRIENT_COLUMNS.length + 4}
                      className="text-center text-muted-foreground py-10"
                    >
                      {itemsLoading
                        ? "Carregando..."
                        : "Nenhum alimento cadastrado. Clique em \"Popular base\" para importar a tabela inicial."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium sticky left-0 bg-card z-10 capitalize">
                        {it.nome}
                      </TableCell>
                      <TableCell className="capitalize">{it.categoria}</TableCell>
                      <TableCell className="capitalize">{it.origem}</TableCell>
                      {NUTRIENT_COLUMNS.map((c) => (
                        <TableCell key={c.key} className="text-right tabular-nums">
                          {it.nutrientes[c.key] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right sticky right-0 bg-card z-10">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(it.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar alimento" : "Novo alimento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm({ ...form, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select
                value={form.origem}
                onValueChange={(v) => setForm({ ...form, origem: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 pt-2">
              <h3 className="text-sm font-semibold mb-2">Composição nutricional</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {NUTRIENT_COLUMNS.map((c) => (
                  <div key={c.key} className="space-y-1.5">
                    <Label htmlFor={c.key} className="text-xs">
                      {c.label} <span className="text-muted-foreground">({c.unit})</span>
                    </Label>
                    <Input
                      id={c.key}
                      type="number"
                      step="0.001"
                      value={form.nutrientes[c.key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrientes: {
                            ...form.nutrientes,
                            [c.key]: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir alimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
