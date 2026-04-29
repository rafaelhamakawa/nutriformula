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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Calculator, HeartPulse, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/nutricao-clinica")({
  head: () => ({ meta: [{ title: "Nutrição Clínica — NutriForm" }] }),
  component: NutricaoClinicaPage,
});

interface Patient {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  idade: string;
  sexo: "macho" | "femea" | "castrado" | "";
  peso: number;
  condicaoCorporal: number;
  comorbidades: string;
  observacoes: string;
}

const empty = (): Omit<Patient, "id"> => ({
  nome: "",
  especie: "",
  raca: "",
  idade: "",
  sexo: "",
  peso: 0,
  condicaoCorporal: 5,
  comorbidades: "",
  observacoes: "",
});

function NutricaoClinicaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useLocalStorage<Patient[]>("nf:patients", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(empty());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [calcId, setCalcId] = useState<string | null>(null);
  const [result, setResult] = useState<{ rer: number; der: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const calcPatient = useMemo(
    () => patients.find((p) => p.id === calcId) ?? null,
    [patients, calcId],
  );

  if (loading || !user) return null;

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    const { id: _id, ...rest } = p;
    setForm(rest);
    setOpen(true);
  };

  const save = () => {
    if (!form.nome.trim() || !form.especie.trim()) {
      toast.error("Nome e espécie são obrigatórios");
      return;
    }
    if (editing) {
      setPatients(patients.map((p) => (p.id === editing.id ? { ...editing, ...form } : p)));
      toast.success("Paciente atualizado");
    } else {
      setPatients([...patients, { id: crypto.randomUUID(), ...form }]);
      toast.success("Paciente cadastrado");
    }
    setOpen(false);
  };

  const remove = () => {
    if (!deleteId) return;
    setPatients(patients.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    toast.success("Paciente removido");
  };

  const calculate = (p: Patient) => {
    // Cálculo simplificado: RER = 70 * (peso^0.75); DER = RER * fator (placeholder 1.6)
    const peso = Number(p.peso) || 0;
    const rer = peso > 0 ? Math.round(70 * Math.pow(peso, 0.75)) : 0;
    const der = Math.round(rer * 1.6);
    setCalcId(p.id);
    setResult({ rer, der });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg p-3"
              style={{ background: "var(--gradient-primary)" }}
            >
              <HeartPulse className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nutrição Clínica</h1>
              <p className="text-sm text-muted-foreground">
                Cadastro de pacientes e cálculo de dieta
              </p>
            </div>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo paciente
          </Button>
        </div>

        <Card className="bg-card/40 backdrop-blur">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">CC</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum paciente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.especie}</TableCell>
                    <TableCell>{p.raca || "—"}</TableCell>
                    <TableCell>{p.idade || "—"}</TableCell>
                    <TableCell className="capitalize">{p.sexo || "—"}</TableCell>
                    <TableCell className="text-right">{p.peso}</TableCell>
                    <TableCell className="text-right">{p.condicaoCorporal}/9</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => calculate(p)}>
                          <Calculator className="h-4 w-4 mr-1" /> Calcular dieta
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(p.id)}
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
        </Card>
      </main>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Espécie</Label>
              <Input
                placeholder="Cão, gato, jabuti..."
                value={form.especie}
                onChange={(e) => setForm({ ...form, especie: e.target.value })}
              />
            </div>
            <div>
              <Label>Raça</Label>
              <Input
                value={form.raca}
                onChange={(e) => setForm({ ...form, raca: e.target.value })}
              />
            </div>
            <div>
              <Label>Idade</Label>
              <Input
                placeholder="Ex: 3 anos"
                value={form.idade}
                onChange={(e) => setForm({ ...form, idade: e.target.value })}
              />
            </div>
            <div>
              <Label>Sexo</Label>
              <Select
                value={form.sexo}
                onValueChange={(v) => setForm({ ...form, sexo: v as Patient["sexo"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Macho</SelectItem>
                  <SelectItem value="femea">Fêmea</SelectItem>
                  <SelectItem value="castrado">Castrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Condição corporal (1 a 9)</Label>
              <Input
                type="number"
                min="1"
                max="9"
                value={form.condicaoCorporal}
                onChange={(e) =>
                  setForm({ ...form, condicaoCorporal: Number(e.target.value) })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Comorbidades</Label>
              <Textarea
                rows={2}
                value={form.comorbidades}
                onChange={(e) => setForm({ ...form, comorbidades: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result dialog */}
      <Dialog
        open={!!calcId}
        onOpenChange={(o) => {
          if (!o) {
            setCalcId(null);
            setResult(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado — {calcPatient?.nome}</DialogTitle>
          </DialogHeader>
          {result && calcPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-card/40">
                  <p className="text-xs text-muted-foreground">RER (repouso)</p>
                  <p className="text-2xl font-bold">{result.rer} kcal/dia</p>
                </Card>
                <Card className="p-4 bg-card/40">
                  <p className="text-xs text-muted-foreground">
                    Necessidade energética estimada (DER)
                  </p>
                  <p className="text-2xl font-bold">{result.der} kcal/dia</p>
                </Card>
              </div>
              <Card className="p-4 bg-card/40">
                <p className="text-sm font-semibold mb-2">Recomendação de dieta</p>
                <p className="text-sm text-muted-foreground">
                  Placeholder — em breve, recomendações específicas baseadas em espécie,
                  condição corporal ({calcPatient.condicaoCorporal}/9) e comorbidades
                  {calcPatient.comorbidades ? ` (${calcPatient.comorbidades})` : ""}.
                </p>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setCalcId(null);
                setResult(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
