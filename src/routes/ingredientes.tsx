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
  DialogTrigger,
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
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  AlertCircle,
  Beaker,
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

interface Ingredient {
  id: string;
  nome: string;
  proteina: number;
  energia: number;
  lisina: number;
  metionina: number;
  calcio: number;
  fosforo: number;
  fibra: number;
  preco: number;
}

const NUMERIC_FIELDS = [
  "proteina",
  "energia",
  "lisina",
  "metionina",
  "calcio",
  "fosforo",
  "fibra",
  "preco",
] as const;

const CSV_HEADERS = ["nome", ...NUMERIC_FIELDS] as const;

const emptyForm = (): Omit<Ingredient, "id"> => ({
  nome: "",
  proteina: 0,
  energia: 0,
  lisina: 0,
  metionina: 0,
  calcio: 0,
  fosforo: 0,
  fibra: 0,
  preco: 0,
});

function IngredientesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useLocalStorage<Ingredient[]>("nf:ingredients", []);
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
    const { id: _id, ...rest } = it;
    setForm(rest);
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
    const sample = `${CSV_HEADERS.join(",")}\nMilho moído,8.5,3350,0.25,0.18,0.03,0.28,2.5,1.20\nFarelo de soja,46,2250,2.85,0.65,0.30,0.65,5.5,2.30`;
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
        <div className="flex items-center gap-3 mb-1">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Beaker className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Ingredientes</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Cadastre, edite e importe ingredientes via CSV.
        </p>

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
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Proteína</TableHead>
                  <TableHead className="text-right">Energia</TableHead>
                  <TableHead className="text-right">Lisina</TableHead>
                  <TableHead className="text-right">Metionina</TableHead>
                  <TableHead className="text-right">Cálcio</TableHead>
                  <TableHead className="text-right">Fósforo</TableHead>
                  <TableHead className="text-right">Fibra</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      Nenhum ingrediente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.nome}</TableCell>
                      <TableCell className="text-right">{it.proteina}</TableCell>
                      <TableCell className="text-right">{it.energia}</TableCell>
                      <TableCell className="text-right">{it.lisina}</TableCell>
                      <TableCell className="text-right">{it.metionina}</TableCell>
                      <TableCell className="text-right">{it.calcio}</TableCell>
                      <TableCell className="text-right">{it.fosforo}</TableCell>
                      <TableCell className="text-right">{it.fibra}</TableCell>
                      <TableCell className="text-right">{it.preco}</TableCell>
                      <TableCell className="text-right">
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
        <DialogContent className="max-w-2xl">
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
            {NUMERIC_FIELDS.map((f) => (
              <div key={f} className="space-y-1.5">
                <Label htmlFor={f} className="capitalize">
                  {f}
                </Label>
                <Input
                  id={f}
                  type="number"
                  step="0.01"
                  value={form[f]}
                  onChange={(e) =>
                    setForm({ ...form, [f]: Number(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
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

function parseCsv(text: string): {
  rows: Omit<Ingredient, "id">[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: Omit<Ingredient, "id">[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows, errors: ["Arquivo vazio."] };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const missing = CSV_HEADERS.filter((h) => !header.includes(h));
  if (missing.length) {
    return {
      rows,
      errors: [`Cabeçalho inválido. Faltando: ${missing.join(", ")}.`],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length !== header.length) {
      errors.push(`Linha ${i + 1}: número de colunas incorreto.`);
      continue;
    }
    const get = (k: string) => cols[header.indexOf(k)];
    const nome = get("nome");
    if (!nome) {
      errors.push(`Linha ${i + 1}: nome vazio.`);
      continue;
    }
    const row: Omit<Ingredient, "id"> = {
      nome,
      proteina: 0, energia: 0, lisina: 0, metionina: 0,
      calcio: 0, fosforo: 0, fibra: 0, preco: 0,
    };
    let bad = false;
    for (const f of NUMERIC_FIELDS) {
      const v = Number(get(f));
      if (Number.isNaN(v)) {
        errors.push(`Linha ${i + 1}: "${f}" inválido.`);
        bad = true;
        break;
      }
      row[f] = v;
    }
    if (!bad) rows.push(row);
  }

  return { rows, errors };
}
