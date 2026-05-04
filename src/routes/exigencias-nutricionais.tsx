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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { NUTRIENT_COLUMNS } from "@/routes/ingredientes";
import iconExigencias from "@/assets/dashboard/exigencias.png";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/exigencias-nutricionais")({
  head: () => ({ meta: [{ title: "Exigências Nutricionais — NutriForm" }] }),
  component: ExigenciasPage,
});

type NutrientKey = typeof NUTRIENT_COLUMNS[number]["key"];

const ESPECIES = ["Cães", "Gatos", "Equinos", "Bovinos", "Aves", "Suínos", "Coelhos", "Peixes", "Outros"] as const;

interface Requirement {
  id: string;
  especie: string;
  categoria: string;
  observacao: string;
  nutrientes: Record<NutrientKey, number>;
}

const emptyNutrients = (): Record<NutrientKey, number> =>
  NUTRIENT_COLUMNS.reduce((acc, c) => {
    acc[c.key] = 0;
    return acc;
  }, {} as Record<NutrientKey, number>);

const empty = (): Omit<Requirement, "id"> => ({
  especie: "",
  categoria: "",
  observacao: "",
  nutrientes: emptyNutrients(),
});

interface Row {
  id: string;
  especie: string | null;
  categoria: string | null;
  observacao: string | null;
  nutrientes: Record<string, number> | null;
}

function ExigenciasPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useSupabaseCollection<Requirement, Row & { user_id: string }>(
    "nutrient_requirements",
    (it) => ({
      especie: it.especie,
      categoria: it.categoria,
      observacao: it.observacao,
      nutrientes: it.nutrientes,
    }),
    (row) => ({
      id: row.id,
      especie: row.especie ?? "",
      categoria: row.categoria ?? "",
      observacao: row.observacao ?? "",
      nutrientes: { ...emptyNutrients(), ...(row.nutrientes ?? {}) } as Record<NutrientKey, number>,
    }),
  );

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [form, setForm] = useState<Omit<Requirement, "id">>(empty);
  const [toDelete, setToDelete] = useState<Requirement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const q = search.toLowerCase();
        return (
          i.especie.toLowerCase().includes(q) ||
          i.categoria.toLowerCase().includes(q) ||
          i.observacao.toLowerCase().includes(q)
        );
      }),
    [items, search],
  );

  if (loading || !user) return <LogoLoader />;

  const openCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (it: Requirement) => {
    setEditing(it);
    const { id: _id, ...rest } = it;
    setForm({ ...rest, nutrientes: { ...emptyNutrients(), ...rest.nutrientes } });
    setOpen(true);
  };

  const save = () => {
    if (!form.especie.trim()) {
      toast.error("Selecione a espécie.");
      return;
    }
    if (!form.categoria.trim()) {
      toast.error("Informe a categoria.");
      return;
    }
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...editing, ...form } : i)));
      toast.success("Exigência atualizada.");
    } else {
      setItems([...items, { id: crypto.randomUUID(), ...form }]);
      toast.success("Exigência cadastrada.");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setItems(items.filter((i) => i.id !== toDelete.id));
    toast.success("Exigência removida.");
    setToDelete(null);
  };

  const exportCsv = () => {
    const headers = ["especie", "categoria", "observacao", ...NUTRIENT_COLUMNS.map((c) => c.key)];
    const escape = (v: string) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const it of items) {
      const row = [
        escape(it.especie),
        escape(it.categoria),
        escape(it.observacao),
        ...NUTRIENT_COLUMNS.map((c) => String(it.nutrientes[c.key] ?? 0)),
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exigencias-nutricionais-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  };

  const parseCsvLine = (line: string): string[] => {
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
        else if (ch === "," || ch === ";") { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (rawLines.length < 2) {
        toast.error("CSV vazio ou sem dados.");
        return;
      }
      const headers = parseCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase());
      const idxOf = (name: string) => headers.indexOf(name.toLowerCase());
      const iEsp = idxOf("especie");
      const iCat = idxOf("categoria");
      const iObs = idxOf("observacao");
      if (iEsp < 0 || iCat < 0) {
        toast.error("Cabeçalho deve conter 'especie' e 'categoria'.");
        return;
      }
      const imported: Requirement[] = [];
      for (let r = 1; r < rawLines.length; r++) {
        const cols = parseCsvLine(rawLines[r]);
        const nutrientes = emptyNutrients();
        for (const c of NUTRIENT_COLUMNS) {
          const idx = idxOf(c.key);
          if (idx >= 0) {
            const v = parseFloat((cols[idx] ?? "").replace(",", "."));
            nutrientes[c.key] = isNaN(v) ? 0 : v;
          }
        }
        imported.push({
          id: crypto.randomUUID(),
          especie: (cols[iEsp] ?? "").trim(),
          categoria: (cols[iCat] ?? "").trim(),
          observacao: iObs >= 0 ? (cols[iObs] ?? "").trim() : "",
          nutrientes,
        });
      }
      setItems([...items, ...imported]);
      toast.success(`${imported.length} exigência(s) importada(s).`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar CSV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <PageHeader
          icon={iconExigencias}
          title="Exigências Nutricionais"
          description="Cadastre as exigências por espécie e categoria animal."
          right={
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Importar CSV
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Nova exigência
              </Button>
            </div>
          }
        />

        <Card className="p-4 md:p-6 bg-card/60 backdrop-blur border-border/50 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por espécie, categoria..."
              className="pl-9"
            />
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Espécie</TableHead>
                  <TableHead className="sticky left-[140px] bg-card z-10 min-w-[180px]">Categoria</TableHead>
                  {NUTRIENT_COLUMNS.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-right">
                      {c.label}
                      <span className="text-muted-foreground ml-1">({c.unit})</span>
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 bg-card z-10 text-right min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={NUTRIENT_COLUMNS.length + 3} className="text-center text-muted-foreground py-10">
                      Nenhuma exigência cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">{it.especie}</TableCell>
                      <TableCell className="sticky left-[140px] bg-card z-10">{it.categoria}</TableCell>
                      {NUTRIENT_COLUMNS.map((c) => (
                        <TableCell key={c.key} className="text-right tabular-nums">
                          {it.nutrientes[c.key] || 0}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 bg-card z-10 text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(it)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar exigência" : "Nova exigência nutricional"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Espécie</Label>
                <Select value={form.especie} onValueChange={(v) => setForm({ ...form, especie: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ESPECIES.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoria / fase</Label>
                <Input
                  id="categoria"
                  placeholder="Ex.: Filhote, Adulto manutenção, Gestante..."
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observação</Label>
              <Input
                id="obs"
                placeholder="Fonte, referência ou observações..."
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                maxLength={300}
              />
            </div>

            <div className="pt-2">
              <h4 className="font-semibold mb-3">Nutrientes</h4>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {NUTRIENT_COLUMNS.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <Label htmlFor={c.key} className="text-xs">
                      {c.label} <span className="text-muted-foreground">({c.unit})</span>
                    </Label>
                    <Input
                      id={c.key}
                      type="number"
                      step="any"
                      value={form.nutrientes[c.key] ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrientes: {
                            ...form.nutrientes,
                            [c.key]: parseFloat(e.target.value) || 0,
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
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exigência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
