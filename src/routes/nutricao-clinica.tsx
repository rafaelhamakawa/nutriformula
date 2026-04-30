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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import { PageHeader } from "@/components/page-header";
import iconClinica from "@/assets/dashboard/clinica.png";
import { Calculator, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";

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
  // Witzel 2014 (cães)
  idadeAnos?: number;
  circCabeca?: number;
  circTorax?: number;
  circPelve?: number;
  compMembroAnt?: number;
  compMembroPelv?: number;
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
  idadeAnos: 0,
  circCabeca: 0,
  circTorax: 0,
  circPelve: 0,
  compMembroAnt: 0,
  compMembroPelv: 0,
});

const isCao = (especie: string) =>
  ["cao", "cães", "cao", "caes", "cachorro", "dog"].includes(
    especie.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );

interface WitzelResult {
  mcm: number;
  mcg: number;
  gc: number;
  ecc: number;
  classificacao: string;
}

function classificarECC(gc: number): { ecc: number; classificacao: string } {
  let ecc = 5;
  if (gc < 10) ecc = 2;
  else if (gc < 15) ecc = 3;
  else if (gc < 20) ecc = 4;
  else if (gc < 25) ecc = 5;
  else if (gc < 30) ecc = 6;
  else if (gc < 35) ecc = 7;
  else if (gc < 40) ecc = 8;
  else ecc = 9;

  let classificacao = "Ideal";
  if (ecc <= 2) classificacao = "Muito magro";
  else if (ecc === 3 || ecc === 4) classificacao = "Magro";
  else if (ecc === 5) classificacao = "Ideal";
  else if (ecc === 6 || ecc === 7) classificacao = "Sobrepeso";
  else classificacao = "Obeso";

  return { ecc, classificacao };
}

function calcularWitzel(p: {
  peso: number;
  idadeAnos: number;
  circCabeca: number;
  circTorax: number;
  circPelve: number;
  compMembroAnt: number;
  compMembroPelv: number;
}): WitzelResult | null {
  const {
    peso,
    idadeAnos,
    circCabeca,
    circTorax,
    circPelve,
    compMembroAnt,
    compMembroPelv,
  } = p;
  if (
    peso <= 0 ||
    idadeAnos <= 0 ||
    circCabeca <= 0 ||
    circTorax <= 0 ||
    circPelve <= 0 ||
    compMembroAnt <= 0 ||
    compMembroPelv <= 0
  ) {
    return null;
  }
  const peso_lbs = peso * 2.20462;

  const baseMCM =
    8.25 * peso_lbs -
    9.02 * idadeAnos +
    8.92 * Math.pow(circCabeca / 6, 2) +
    96.86 * compMembroAnt -
    11.07 * (compMembroAnt - compMembroPelv) -
    357.18;
  const mcm = Math.pow(Math.max(baseMCM, 0), 1.333) * 0.8;

  const mcg =
    229.04 * peso_lbs -
    416.63 * Math.pow(compMembroPelv, 1.2) +
    157.78 * (circTorax - circCabeca) +
    908.79;

  const gc =
    0.71 * circTorax -
    0.1 * Math.pow(circPelve, 2) -
    5.78 * Math.pow(compMembroPelv, 0.8) +
    26.56 * (circPelve / circCabeca) +
    2.06;

  const { ecc, classificacao } = classificarECC(gc);
  return { mcm, mcg, gc, ecc, classificacao };
}

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Como medir"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Como medir?
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

function NutricaoClinicaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useSupabaseCollection<Patient, Patient & { user_id: string }>(
    "patients",
    (p) => ({
      nome: p.nome,
      especie: p.especie,
      raca: p.raca,
      idade: p.idade,
      sexo: p.sexo,
      peso: p.peso,
      condicao_corporal: p.condicaoCorporal,
      comorbidades: p.comorbidades,
      observacoes: p.observacoes,
      idade_anos: p.idadeAnos ?? null,
      circ_cabeca: p.circCabeca ?? null,
      circ_torax: p.circTorax ?? null,
      circ_pelve: p.circPelve ?? null,
      comp_membro_ant: p.compMembroAnt ?? null,
      comp_membro_pelv: p.compMembroPelv ?? null,
    }),
    (row: any) => ({
      id: row.id,
      nome: row.nome ?? "",
      especie: row.especie ?? "",
      raca: row.raca ?? "",
      idade: row.idade ?? "",
      sexo: (row.sexo ?? "") as Patient["sexo"],
      peso: Number(row.peso) || 0,
      condicaoCorporal: Number(row.condicao_corporal) || 0,
      comorbidades: row.comorbidades ?? "",
      observacoes: row.observacoes ?? "",
      idadeAnos: row.idade_anos != null ? Number(row.idade_anos) : undefined,
      circCabeca: row.circ_cabeca != null ? Number(row.circ_cabeca) : undefined,
      circTorax: row.circ_torax != null ? Number(row.circ_torax) : undefined,
      circPelve: row.circ_pelve != null ? Number(row.circ_pelve) : undefined,
      compMembroAnt: row.comp_membro_ant != null ? Number(row.comp_membro_ant) : undefined,
      compMembroPelv: row.comp_membro_pelv != null ? Number(row.comp_membro_pelv) : undefined,
    }),
  );
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

  const witzelLive = useMemo(() => {
    if (!isCao(form.especie)) return null;
    return calcularWitzel({
      peso: Number(form.peso) || 0,
      idadeAnos: Number(form.idadeAnos) || 0,
      circCabeca: Number(form.circCabeca) || 0,
      circTorax: Number(form.circTorax) || 0,
      circPelve: Number(form.circPelve) || 0,
      compMembroAnt: Number(form.compMembroAnt) || 0,
      compMembroPelv: Number(form.compMembroPelv) || 0,
    });
  }, [form]);

  if (loading || !user) return null;

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    const { id: _id, ...rest } = p;
    setForm({ ...empty(), ...rest });
    setOpen(true);
  };

  const save = () => {
    if (!form.nome.trim() || !form.especie.trim()) {
      toast.error("Nome e espécie são obrigatórios");
      return;
    }
    const next: Omit<Patient, "id"> = { ...form };
    if (isCao(form.especie) && witzelLive) {
      next.condicaoCorporal = witzelLive.ecc;
    }
    if (editing) {
      setPatients(
        patients.map((p) => (p.id === editing.id ? { ...editing, ...next } : p)),
      );
      toast.success("Paciente atualizado");
    } else {
      setPatients([...patients, { id: crypto.randomUUID(), ...next }]);
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
    const peso = Number(p.peso) || 0;
    const rer = peso > 0 ? Math.round(70 * Math.pow(peso, 0.75)) : 0;
    const der = Math.round(rer * 1.6);
    setCalcId(p.id);
    setResult({ rer, der });
  };

  const showWitzel = isCao(form.especie);

  return (
    <TooltipProvider delayDuration={150}>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Select
                  value={form.especie}
                  onValueChange={(v) => setForm({ ...form, especie: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cães">Cães</SelectItem>
                    <SelectItem value="Gatos">Gatos</SelectItem>
                    <SelectItem value="Equinos">Equinos</SelectItem>
                    <SelectItem value="Bovinos">Bovinos</SelectItem>
                    <SelectItem value="Suínos">Suínos</SelectItem>
                    <SelectItem value="Aves">Aves</SelectItem>
                    <SelectItem value="Jabuti">Jabuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Raça</Label>
                <Input
                  value={form.raca}
                  onChange={(e) => setForm({ ...form, raca: e.target.value })}
                />
              </div>
              <div>
                <Label>Idade (descrição)</Label>
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
                  value={form.peso || ""}
                  onChange={(e) => setForm({ ...form, peso: Number(e.target.value) })}
                />
              </div>
              {!showWitzel && (
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
              )}
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

              {showWitzel && (
                <div className="sm:col-span-2 mt-2 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Composição corporal — Witzel (2014)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Medidas morfométricas para cálculo automático em cães.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Idade (anos)</Label>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.idadeAnos || ""}
                        onChange={(e) =>
                          setForm({ ...form, idadeAnos: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Circunferência da cabeça (cm)</Label>
                        <FieldHelp text="Região entre olhos e orelhas — mensure ao redor da cabeça passando pela linha logo acima dos olhos e à frente das orelhas." />
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.circCabeca || ""}
                        onChange={(e) =>
                          setForm({ ...form, circCabeca: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Circunferência torácica (cm)</Label>
                        <FieldHelp text="Nível da 5ª costela — passe a fita ao redor do tórax, logo atrás dos membros anteriores, na altura da 5ª costela." />
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.circTorax || ""}
                        onChange={(e) =>
                          setForm({ ...form, circTorax: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Circunferência pélvica (cm)</Label>
                        <FieldHelp text="Região lombar — passe a fita ao redor do corpo, na altura da última vértebra lombar / cintura pélvica." />
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.circPelve || ""}
                        onChange={(e) =>
                          setForm({ ...form, circPelve: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Comprimento do membro anterior (cm)</Label>
                        <FieldHelp text="Meça do olécrano (cotovelo) até o solo, com o animal em estação, membro perpendicular ao chão." />
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.compMembroAnt || ""}
                        onChange={(e) =>
                          setForm({ ...form, compMembroAnt: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Comprimento do membro pélvico (cm)</Label>
                        <FieldHelp text="Meça da tuberosidade do calcâneo (jarrete) até o solo, com o animal em estação." />
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.compMembroPelv || ""}
                        onChange={(e) =>
                          setForm({ ...form, compMembroPelv: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  {witzelLive ? (
                    <Card
                      className="p-4 border-primary/30"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <p className="text-xs uppercase tracking-wide text-primary-foreground/80 mb-3">
                        Resultado — Witzel (2014)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-primary-foreground">
                        <div>
                          <p className="text-[10px] opacity-80">Massa magra</p>
                          <p className="text-lg font-bold">
                            {witzelLive.mcm.toFixed(0)} g
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-80">Massa gorda</p>
                          <p className="text-lg font-bold">
                            {witzelLive.mcg.toFixed(0)} g
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-80">% Gordura</p>
                          <p className="text-lg font-bold">{witzelLive.gc.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-80">ECC</p>
                          <p className="text-lg font-bold">{witzelLive.ecc}/9</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-primary-foreground">
                        Classificação: {witzelLive.classificacao}
                      </p>
                    </Card>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Preencha todas as medidas (valores &gt; 0) para ver o cálculo
                      automático.
                    </p>
                  )}
                </div>
              )}
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
    </TooltipProvider>
  );
}
