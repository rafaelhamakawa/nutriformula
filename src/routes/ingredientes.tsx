import { LogoLoader } from "@/components/logo-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import iconIngredientes from "@/assets/dashboard/ingredientes.png";
import {
  AlertCircle,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/ingredientes")({
  head: () => ({ meta: [{ title: "Ingredientes — NutriForm" }] }),
  component: IngredientesPage,
});

// Lista de nutrientes (colunas) — mesma ordem solicitada pelo usuário.
export const NUTRIENT_COLUMNS = [
  { key: "proteina_bruta", label: "Proteína Bruta", unit: "%" },
  { key: "energia_metabolizavel", label: "Energia Metabolizável", unit: "kcal/kg" },
  { key: "energia_digestivel", label: "Energia Digestível", unit: "kcal/kg" },
  { key: "gordura", label: "Gordura", unit: "%" },
  { key: "ac_linoleico", label: "Ac. Linoléico", unit: "%" },
  { key: "amido", label: "Amido", unit: "%" },
  { key: "fibra_bruta", label: "Fibra bruta", unit: "%" },
  { key: "fdn", label: "FDN", unit: "%" },
  { key: "fda", label: "FDA", unit: "%" },
  { key: "lisina_dig", label: "Lisina Digestível", unit: "%" },
  { key: "met_cist_dig", label: "Met. + Cist. Digestível", unit: "%" },
  { key: "treonina_dig", label: "Treonina Digestível", unit: "%" },
  { key: "triptofano_dig", label: "Triptofano Digestível", unit: "%" },
  { key: "isoleucina_dig", label: "Isoleucina Digestível", unit: "%" },
  { key: "valina_dig", label: "Valina Digestível", unit: "%" },
  { key: "leucina_dig", label: "Leucina Digestível", unit: "%" },
  { key: "arginina_dig", label: "Arginina Digestível", unit: "%" },
  { key: "fen_tir_dig", label: "Fen. + Tir. Digestível", unit: "%" },
  { key: "histidina_dig", label: "Histidina Digestível", unit: "%" },
  { key: "glutamato_dig", label: "Glutamato Digestível", unit: "%" },
  { key: "fosforo_dig", label: "Fósforo Digestível", unit: "%" },
  { key: "calcio", label: "Cálcio", unit: "%" },
  { key: "potassio", label: "Potássio", unit: "%" },
  { key: "sodio", label: "Sódio", unit: "%" },
  { key: "cloro", label: "Cloro", unit: "%" },
  { key: "glutamina", label: "Glutamina", unit: "%" },
  { key: "alanina", label: "Alanina", unit: "%" },
] as const;

type NutrientKey = typeof NUTRIENT_COLUMNS[number]["key"];

interface Ingredient {
  id: string;
  nome: string;
  preco: number;
  nutrientes: Record<NutrientKey, number>;
}

const emptyNutrients = (): Record<NutrientKey, number> =>
  NUTRIENT_COLUMNS.reduce((acc, c) => {
    acc[c.key] = 0;
    return acc;
  }, {} as Record<NutrientKey, number>);

const emptyForm = (): Omit<Ingredient, "id"> => ({
  nome: "",
  preco: 0,
  nutrientes: emptyNutrients(),
});

const CSV_HEADERS = ["nome", "preco", ...NUTRIENT_COLUMNS.map((c) => c.key)];

function IngredientesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useSupabaseCollection<
    Ingredient,
    {
      id: string;
      user_id: string;
      nome: string;
      preco: number | null;
      nutrientes: Record<string, number> | null;
    }
  >(
    "ingredients",
    (it) => ({
      nome: it.nome,
      preco: it.preco,
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
        preco: Number(row.preco) || 0,
        nutrientes: base,
      };
    },
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<Omit<Ingredient, "id">>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const filtered = useMemo(
    () => items.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  if (loading || !user) {
    return <LogoLoader />;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (it: Ingredient) => {
    setEditing(it);
    setForm({ nome: it.nome, preco: it.preco, nutrientes: { ...it.nutrientes } });
    setOpen(true);
  };

  const save = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do ingrediente.");
      return;
    }
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...editing, ...form } : i)));
      toast.success("Ingrediente atualizado.");
    } else {
      setItems([...items, { id: crypto.randomUUID(), ...form }]);
      toast.success("Ingrediente criado.");
    }
    setOpen(false);
  };

  const remove = () => {
    if (!deleteId) return;
    setItems(items.filter((i) => i.id !== deleteId));
    setDeleteId(null);
    toast.success("Ingrediente excluído.");
  };

  const downloadTemplate = () => {
    const sample = `${CSV_HEADERS.join(",")}\nMilho moído,1.20,${NUTRIENT_COLUMNS.map(() => "0").join(",")}`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-ingredientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErrors([]);
    try {
      const text = await file.text();
      const { rows, errors } = parseCsv(text);
      if (errors.length) {
        setUploadErrors(errors);
        if (rows.length === 0) {
          toast.error("Falha ao importar CSV.");
          return;
        }
      }
      const withIds: Ingredient[] = rows.map((r) => ({ id: crypto.randomUUID(), ...r }));
      setItems([...items, ...withIds]);
      toast.success(`${withIds.length} ingrediente(s) importado(s).`);
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <PageHeader
          icon={iconIngredientes}
          title="Ingredientes"
          description="Cadastre, edite e importe ingredientes via CSV."
        />

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50 mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Baixar modelo
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload CSV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleUpload}
              />
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Novo
              </Button>
            </div>
          </div>

          {uploadErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erros no CSV</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {uploadErrors.slice(0, 8).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {uploadErrors.length > 8 && (
                    <li>... e mais {uploadErrors.length - 8} erro(s).</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Nome</TableHead>
                  {NUTRIENT_COLUMNS.map((c) => (
                    <TableHead key={c.key} className="text-right whitespace-nowrap">
                      {c.label}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {c.unit}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right whitespace-nowrap">
                    Preço
                    <span className="block text-[10px] font-normal text-muted-foreground">R$/kg</span>
                  </TableHead>
                  <TableHead className="text-right sticky right-0 bg-card z-10">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={NUTRIENT_COLUMNS.length + 3}
                      className="text-center text-muted-foreground py-10"
                    >
                      Nenhum ingrediente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium sticky left-0 bg-card z-10">
                        {it.nome}
                      </TableCell>
                      {NUTRIENT_COLUMNS.map((c) => (
                        <TableCell key={c.key} className="text-right tabular-nums">
                          {it.nutrientes[c.key] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">{it.preco}</TableCell>
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
            <DialogTitle>{editing ? "Editar ingrediente" : "Novo ingrediente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preco">Preço (R$/kg)</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: Number(e.target.value) || 0 })}
              />
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
                      step="0.01"
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
            <AlertDialogTitle>Excluir ingrediente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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

// ---------- CSV parser ----------

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === sep) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(text: string): {
  rows: Omit<Ingredient, "id">[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: Omit<Ingredient, "id">[] = [];

  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { rows, errors: ["Arquivo vazio."] };
  }

  // Detect separator: prefer the one that yields more columns in header
  const sep = (lines[0].split(";").length > lines[0].split(",").length) ? ";" : ",";

  const header = parseCsvLine(lines[0], sep).map((h) => h.toLowerCase());
  if (!header.includes("nome")) {
    return {
      rows,
      errors: [`Cabeçalho inválido. Faltando: nome. Encontrado: ${header.join(", ")}`],
    };
  }

  const idxOf = (k: string) => header.indexOf(k.toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], sep);
    const get = (k: string) => {
      const idx = idxOf(k);
      return idx >= 0 ? (cols[idx] ?? "") : "";
    };
    const nome = get("nome");
    if (!nome) {
      errors.push(`Linha ${i + 1}: nome vazio.`);
      continue;
    }
    const nutrientes = emptyNutrients();
    for (const c of NUTRIENT_COLUMNS) {
      if (idxOf(c.key) < 0) continue;
      const raw = get(c.key).replace(",", ".");
      if (raw === "") continue;
      const v = Number(raw);
      if (Number.isFinite(v)) nutrientes[c.key] = v;
    }
    const precoRaw = idxOf("preco") >= 0 ? Number(get("preco").replace(",", ".")) : 0;
    const preco = Number.isFinite(precoRaw) ? precoRaw : 0;
    rows.push({ nome, preco, nutrientes });
  }

  return { rows, errors };
}
