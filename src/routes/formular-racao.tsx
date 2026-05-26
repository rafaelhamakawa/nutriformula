import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogoLoader } from "@/components/logo-loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseCollection } from "@/hooks/use-supabase-collection";
import {
  calcularFormulaAutomatica,
  type IngredienteEntrada,
  type ExigenciaNutriente,
  type ResultadoFormulacao,
} from "@/lib/formulacao";
import { PageHeader } from "@/components/page-header";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Sparkles,
  Weight,
} from "lucide-react";
import logo from "@/assets/logo.png";
import iconFormular from "@/assets/dashboard/formular.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NUTRIENT_COLUMNS } from "@/routes/ingredientes";

import frangoImg from "@/assets/species/frango.png";
import poedeiraImg from "@/assets/species/poedeira.png";
import codornaImg from "@/assets/species/codorna.png";
import calopsitaImg from "@/assets/species/calopsita.png";
import suinosImg from "@/assets/species/suinos.png";
import bovinoImg from "@/assets/species/bovino.png";
import equinosImg from "@/assets/species/equinos.png";
import caesImg from "@/assets/species/caes.png";
import gatosImg from "@/assets/species/gatos.png";
import jabutiImg from "@/assets/species/jabuti.png";
import coelhoImg from "@/assets/species/coelho.png";
import tilapiaImg from "@/assets/species/tilapia.png";
import carpaImg from "@/assets/species/carpa.png";

const SPECIE_IMAGES: Record<Specie, string> = {
  frango: frangoImg,
  poedeira: poedeiraImg,
  codorna: codornaImg,
  calopsita: calopsitaImg,
  suinos: suinosImg,
  "bovino-corte": bovinoImg,
  equinos: equinosImg,
  caes: caesImg,
  gatos: gatosImg,
  jabuti: jabutiImg,
  coelho: coelhoImg,
  tilapia: tilapiaImg,
  "carpa-ornamental": carpaImg,
};

export const Route = createFileRoute("/formular-racao")({
  head: () => ({ meta: [{ title: "Formular Ração — NutriForm" }] }),
  component: FormularRacaoWizard,
});

// ---------- Types & data ----------

type Specie =
  | "frango"
  | "poedeira"
  | "codorna"
  | "calopsita"
  | "suinos"
  | "bovino-corte"
  | "equinos"
  | "caes"
  | "gatos"
  | "jabuti"
  | "coelho"
  | "tilapia"
  | "carpa-ornamental";

type FeedType = "peletizada" | "natural";
type CalcType = "automatico" | "manual";

// Espécies pet que exigem peso corporal para cálculo
const PET_SPECIES: Specie[] = ["caes", "gatos", "jabuti", "calopsita", "coelho"];

interface Range {
  min: string;
  max: string;
}

interface WizardState {
  specie: Specie | null;
  feedType: FeedType | null;
  pesoCorporal: string; // kg — usado para pets
  categoria: string;    // fase/categoria animal
  ingredients: string[];
  nutrients: string[];  // chaves reais dos nutrientes (ex: proteina_bruta)
  ingredientLimits: Record<string, Range>;
  nutrientLimits: Record<string, Range>;
  calcType: CalcType | null;
}

const SPECIES: { value: Specie; label: string; group: string }[] = [
  { value: "frango", label: "Frango", group: "Aves" },
  { value: "poedeira", label: "Poedeira", group: "Aves" },
  { value: "codorna", label: "Codorna", group: "Aves" },
  { value: "calopsita", label: "Calopsita", group: "Aves" },
  { value: "suinos", label: "Suínos", group: "Suínos" },
  { value: "bovino-corte", label: "Bovino de Corte", group: "Bovinos" },
  { value: "equinos", label: "Equinos", group: "Equinos" },
  { value: "caes", label: "Cães", group: "Pets" },
  { value: "gatos", label: "Gatos", group: "Pets" },
  { value: "jabuti", label: "Jabuti", group: "Répteis" },
  { value: "coelho", label: "Coelho", group: "Coelhos" },
  { value: "tilapia", label: "Tilápia do Nilo", group: "Peixes" },
  { value: "carpa-ornamental", label: "Carpa Ornamental (Nishikigoi)", group: "Peixes" },
];

const NATURAL_ALLOWED: Specie[] = ["caes", "gatos", "jabuti", "calopsita"];

const SPECIE_TO_REQ_ESPECIE: Record<Specie, string> = {
  frango: "Aves",
  poedeira: "Aves",
  codorna: "Aves",
  calopsita: "Aves",
  suinos: "Suínos",
  "bovino-corte": "Bovinos",
  equinos: "Equinos",
  caes: "Cães",
  gatos: "Gatos",
  jabuti: "Outros",
  coelho: "Coelhos",
  tilapia: "Peixes",
  "carpa-ornamental": "Peixes",
};

const norm = (s: string) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function specieMatchers(specie: Specie | null): string[] {
  if (!specie) return [];
  const labels = SPECIES.filter((s) => s.value === specie).map((s) => s.label);
  const groups = SPECIES.filter((s) => s.value === specie).map((s) => s.group);
  const aliases: Partial<Record<Specie, string[]>> = {
    frango: ["Frangos", "Frango de corte", "Frangos de corte", "Aves de corte", "Aves/Frangos"],
    poedeira: ["Poedeiras", "Galinhas poedeiras", "Aves de postura"],
    codorna: ["Codornas", "Aves/Codornas"],
    calopsita: ["Calopsitas", "Aves/Calopsitas"],
    suinos: ["Suíno", "Suinos"],
    "bovino-corte": ["Bovino", "Bovinos de corte"],
    caes: ["Cão", "Cães", "Caes", "Caninos"],
    gatos: ["Gato", "Felinos"],
    jabuti: ["Jabutis", "Quelônios", "Repteis", "Répteis"],
    coelho: ["Coelhos", "Cunícolas", "Cunicultura"],
    tilapia: ["Tilápia", "Tilapias", "Tilápias", "Tilápia do Nilo", "Peixes", "Peixe", "Piscicultura"],
    "carpa-ornamental": ["Carpa", "Carpas", "Carpa Ornamental", "Carpa Nishikigoi", "Nishikigoi", "Koi", "Peixes", "Peixe", "Peixes Ornamentais"],
  };
  return Array.from(new Set([SPECIE_TO_REQ_ESPECIE[specie], ...labels, ...groups, specie, ...(aliases[specie] ?? [])])).map(norm);
}

function requirementMatchesSpecie(reqEspecie: string, specie: Specie | null): boolean {
  const matchers = specieMatchers(specie);
  const normalized = norm(reqEspecie);
  return matchers.some((m) => normalized === m || normalized.includes(m) || m.includes(normalized));
}

// Steps do wizard — agora com "Categoria/Peso" depois da espécie
const STEPS = [
  "Espécie",
  "Categoria / Peso",
  "Tipo de alimentação",
  "Ingredientes",
  "Nutrientes",
  "Restrições",
  "Cálculo",
  "Resultado",
];

// ---------- Component ----------

interface IngredientRow {
  id: string;
  nome: string;
  preco: number;
  nutrientes: Record<string, number>;
}

interface RequirementRow {
  id: string;
  especie: string;
  categoria: string;
  observacao: string;
  nutrientes: Record<string, number>;
}

function getRequirementCategories(requirements: RequirementRow[], specie: Specie | null): string[] {
  const rows = requirements.filter(
    (r) => requirementMatchesSpecie(r.especie, specie) && r.categoria.trim().length > 0,
  );
  return Array.from(new Map(rows.map((r) => [norm(r.categoria), r.categoria.trim()])).values());
}

function findRequirementForCategory(
  requirements: RequirementRow[],
  specie: Specie | null,
  categoria: string,
): RequirementRow | undefined {
  return requirements.find(
    (r) => norm(r.categoria) === norm(categoria) && requirementMatchesSpecie(r.especie, specie),
  );
}

/**
 * Retorna os nutrientes que têm valor > 0 na exigência selecionada,
 * usando as chaves reais do banco (ex: proteina_bruta, calcio…)
 */
function getNutrientsFromRequirement(req: RequirementRow | undefined): string[] {
  if (!req) return [];
  return Object.entries(req.nutrientes)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k]) => k);
}

/**
 * Aplica os valores mínimos da exigência selecionada nos limites de nutrientes.
 * Usa as chaves reais do banco diretamente.
 */
function applyRequirementMinimums(state: WizardState, req: RequirementRow): WizardState {
  let changed = false;
  const nextLimits = { ...state.nutrientLimits };
  for (const nutrientKey of state.nutrients) {
    // Tenta a chave exata primeiro, depois normalizada
    const rawVal = req.nutrientes[nutrientKey];
    const v = typeof rawVal === "number" && Number.isFinite(rawVal) && rawVal > 0 ? rawVal : undefined;
    if (v !== undefined) {
      const current = nextLimits[nutrientKey] ?? { min: "", max: "" };
      const min = String(v);
      if (current.min !== min) {
        nextLimits[nutrientKey] = { ...current, min };
        changed = true;
      }
    }
  }
  return changed ? { ...state, nutrientLimits: nextLimits } : state;
}

/**
 * Calcula exigências por peso metabólico para pets (cães e gatos).
 * Fator NRC: EM_repouso = 70 * peso^0.75 kcal/dia
 * Retorna um objeto com as chaves e os valores ajustados (por 100g de ração).
 */
function ajustarExigenciasPorPeso(req: RequirementRow, pesoCorporalKg: number): Record<string, number> {
  if (pesoCorporalKg <= 0) return req.nutrientes;
  // Energia de manutenção (kcal/dia) — NRC 2006
  const emDia = 70 * Math.pow(pesoCorporalKg, 0.75);
  // Assume que o req.nutrientes.energia_metabolizavel está em kcal/kg de ração
  // Calcula quanto de ração/dia (kg) o animal precisa
  const emRacao = req.nutrientes["energia_metabolizavel"] || req.nutrientes["energia_digestivel"] || 0;
  if (emRacao <= 0) return req.nutrientes;
  const racaoDia_kg = emDia / emRacao;
  // Proteína: g/dia -> % na ração
  // As exigências do banco estão em % (g/100g), então deixamos como estão
  // e apenas anotamos a exigência ajustada como referência informativa
  return req.nutrientes; // Os % permanecem, o usuário verá a quantidade/dia em informativo
}

function FormularRacaoWizard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    specie: null,
    feedType: null,
    pesoCorporal: "",
    categoria: "",
    ingredients: [],
    nutrients: [],
    ingredientLimits: {},
    nutrientLimits: {},
    calcType: null,
  });
  const [search, setSearch] = useState("");
  const [manualSeed, setManualSeed] = useState<Record<string, number> | null>(null);

  const [ingredientsList] = useSupabaseCollection<
    IngredientRow,
    { id: string; user_id: string; nome: string; preco: number | null; nutrientes: Record<string, number> | null }
  >(
    "ingredients",
    (it) => ({ nome: it.nome, preco: it.preco, nutrientes: it.nutrientes }),
    (row) => ({
      id: row.id,
      nome: row.nome,
      preco: Number(row.preco) || 0,
      nutrientes: (row.nutrientes ?? {}) as Record<string, number>,
    }),
  );

  const [requirementsList] = useSupabaseCollection<
    RequirementRow,
    {
      id: string;
      user_id: string;
      especie: string | null;
      categoria: string | null;
      observacao: string | null;
      nutrientes: Record<string, number> | null;
    }
  >(
    "nutrient_requirements",
    (it) => ({ especie: it.especie, categoria: it.categoria, observacao: it.observacao, nutrientes: it.nutrientes }),
    (row) => ({
      id: row.id,
      especie: row.especie ?? "",
      categoria: row.categoria ?? "",
      observacao: row.observacao ?? "",
      nutrientes: (row.nutrientes ?? {}) as Record<string, number>,
    }),
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Quando a espécie muda, define a categoria automaticamente
  useEffect(() => {
    setState((current) => {
      if (!current.specie) return { ...current, categoria: "" };
      const categories = getRequirementCategories(requirementsList, current.specie);
      const stillValid = current.categoria && categories.some((cat) => norm(cat) === norm(current.categoria));
      const newCategoria = stillValid ? current.categoria : (categories[0] ?? "");
      return { ...current, categoria: newCategoria };
    });
  }, [requirementsList, state.specie]);

  // Quando a categoria muda, preenche automáticamente os nutrientes disponíveis
  // e os limites mínimos
  useEffect(() => {
    if (!state.categoria) return;
    const req = findRequirementForCategory(requirementsList, state.specie, state.categoria);
    if (!req) return;

    // Pega os nutrientes que têm valor na exigência
    const availableNutrients = getNutrientsFromRequirement(req);

    setState((s) => {
      // Mantém os nutrientes já selecionados que ainda existem na exigência
      // e adiciona os novos automaticamente se a lista estava vazia
      const nextNutrients = s.nutrients.length === 0
        ? availableNutrients
        : s.nutrients.filter((n) => availableNutrients.includes(n) || availableNutrients.length === 0);

      const stateWithNutrients = { ...s, nutrients: nextNutrients };
      return applyRequirementMinimums(stateWithNutrients, req);
    });
  }, [requirementsList, state.categoria, state.specie]);

  if (loading || !user) {
    return <LogoLoader label="Preparando o formulador..." />;
  }

  const isPet = state.specie ? PET_SPECIES.includes(state.specie) : false;

  const canNext = (() => {
    switch (step) {
      case 0: return !!state.specie;
      case 1: return !!state.categoria || (!isPet && true); // categoria é obrigatória
      case 2: return !!state.feedType;
      case 3: return state.ingredients.length > 0;
      case 4: return state.nutrients.length > 0;
      case 5: return true;
      case 6: return !!state.calcType;
      default: return true;
    }
  })();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="NutriForm" className="h-9 w-9" />
            <span className="text-lg font-bold">NutriForm</span>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Sair do wizard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-4xl">
        <PageHeader
          icon={iconFormular}
          title="Formular Ração"
          description={`Etapa ${step + 1} de ${STEPS.length} — ${STEPS[step]}`}
        />

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <Card className="p-6 md:p-8 bg-card/60 backdrop-blur border-border/50">
          <div key={step} className="animate-step-in">

          {step === 0 && (
            <StepSpecie
              value={state.specie}
              onChange={(v) => {
                setState((s) => ({
                  ...s,
                  specie: v,
                  categoria: "",
                  nutrients: [],
                  nutrientLimits: {},
                  feedType:
                    s.feedType === "natural" && !NATURAL_ALLOWED.includes(v)
                      ? null
                      : s.feedType,
                }));
                next();
              }}
            />
          )}

          {step === 1 && (
            <StepCategoriaEPeso
              specie={state.specie}
              requirements={requirementsList}
              categoria={state.categoria}
              pesoCorporal={state.pesoCorporal}
              isPet={isPet}
              onCategoriaChange={(cat) => {
                setState((s) => ({ ...s, categoria: cat, nutrients: [], nutrientLimits: {} }));
              }}
              onPesoChange={(peso) => setState((s) => ({ ...s, pesoCorporal: peso }))}
            />
          )}

          {step === 2 && (
            <StepFeedType
              specie={state.specie}
              value={state.feedType}
              onChange={(v) => {
                setState((s) => ({ ...s, feedType: v }));
                next();
              }}
            />
          )}

          {step === 3 && (
            <StepIngredients
              search={search}
              setSearch={setSearch}
              available={ingredientsList}
              selected={state.ingredients}
              onToggle={(ing) =>
                setState((s) => ({
                  ...s,
                  ingredients: s.ingredients.includes(ing)
                    ? s.ingredients.filter((i) => i !== ing)
                    : [...s.ingredients, ing],
                }))
              }
            />
          )}

          {step === 4 && (
            <StepNutrients
              specie={state.specie}
              categoria={state.categoria}
              requirements={requirementsList}
              selected={state.nutrients}
              onToggle={(n) =>
                setState((s) => ({
                  ...s,
                  nutrients: s.nutrients.includes(n)
                    ? s.nutrients.filter((x) => x !== n)
                    : [...s.nutrients, n],
                }))
              }
            />
          )}

          {step === 5 && (
            <StepRestrictions
              specie={state.specie}
              requirements={requirementsList}
              categoria={state.categoria}
              ingredients={state.ingredients}
              nutrients={state.nutrients}
              ingredientLimits={state.ingredientLimits}
              nutrientLimits={state.nutrientLimits}
              setIngredientLimit={(id, range) =>
                setState((s) => ({
                  ...s,
                  ingredientLimits: { ...s.ingredientLimits, [id]: range },
                }))
              }
              setNutrientLimit={(id, range) =>
                setState((s) => ({
                  ...s,
                  nutrientLimits: { ...s.nutrientLimits, [id]: range },
                }))
              }
            />
          )}

          {step === 6 && (
            <StepCalcType
              value={state.calcType}
              onChange={(v) => {
                setState((s) => ({ ...s, calcType: v }));
                next();
              }}
            />
          )}

          {step === 7 && state.calcType === "manual" && (
            <StepResultManual
              state={state}
              ingredientsList={ingredientsList}
              initialPercent={manualSeed}
            />
          )}
          {step === 7 && state.calcType !== "manual" && (
            <StepResult
              state={state}
              ingredientsList={ingredientsList}
              onSwitchToManual={(seed) => {
                setManualSeed(seed);
                setState((s) => ({ ...s, calcType: "manual" }));
              }}
            />
          )}
          </div>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canNext}>
              Avançar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Link to="/dashboard">
              <Button>
                <Check className="h-4 w-4 mr-2" /> Concluir
              </Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------- Steps ----------

function StepSpecie({ value, onChange }: { value: Specie | null; onChange: (v: Specie) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof SPECIES>();
    SPECIES.forEach((s) => {
      const arr = map.get(s.group) ?? [];
      arr.push(s);
      map.set(s.group, arr);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Selecione a espécie</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Para qual animal você está formulando?
      </p>
      <div className="space-y-5">
        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {group}
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {items.map((s) => {
                const active = value === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onChange(s.value)}
                    className={`group flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                      active
                        ? "border-primary bg-primary/15 shadow-[0_0_0_2px_var(--primary)]"
                        : "border-border bg-card/40 hover:border-primary/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <div
                      className={`h-20 w-20 rounded-full overflow-hidden ring-2 transition-all ${
                        active ? "ring-primary" : "ring-border/50 group-hover:ring-primary/40"
                      }`}
                    >
                      <img
                        src={SPECIE_IMAGES[s.value]}
                        alt={s.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="text-sm font-medium text-center">{s.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- NOVO: Step de Categoria e Peso ----
function StepCategoriaEPeso({
  specie,
  requirements,
  categoria,
  pesoCorporal,
  isPet,
  onCategoriaChange,
  onPesoChange,
}: {
  specie: Specie | null;
  requirements: RequirementRow[];
  categoria: string;
  pesoCorporal: string;
  isPet: boolean;
  onCategoriaChange: (cat: string) => void;
  onPesoChange: (peso: string) => void;
}) {
  const especieLabel = specie ? SPECIES.find((s) => s.value === specie)?.label : "";
  const categories = useMemo(
    () => getRequirementCategories(requirements, specie),
    [requirements, specie],
  );

  const selectedReq = useMemo(
    () => findRequirementForCategory(requirements, specie, categoria),
    [requirements, specie, categoria],
  );

  const pesoNum = parseFloat(pesoCorporal);
  const emRacao = selectedReq?.nutrientes["energia_metabolizavel"] || selectedReq?.nutrientes["energia_digestivel"] || 0;
  const emDia = isPet && pesoNum > 0 ? 70 * Math.pow(pesoNum, 0.75) : null;
  const racaoDiaKg = emDia && emRacao > 0 ? emDia / emRacao : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Categoria e fase do animal</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione a fase/categoria de <strong>{especieLabel}</strong> para carregar as exigências nutricionais automaticamente.
        </p>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-700">
            <p className="font-semibold mb-1">Nenhuma exigência cadastrada para {especieLabel}</p>
            <p>Cadastre as exigências em <strong>Exigências Nutricionais</strong> para preencher os valores automaticamente. Você ainda pode continuar e definir os valores manualmente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>Fase / categoria</Label>
            <Select value={categoria} onValueChange={onCategoriaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fase/categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReq && (
              <p className="text-xs text-muted-foreground">
                ✓ Exigências nutricionais encontradas — os valores mínimos serão aplicados automaticamente na etapa de restrições.
              </p>
            )}
          </div>
        )}
      </div>

      {isPet && (
        <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4 text-primary" />
            <Label className="font-semibold">Peso corporal do animal (kg)</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Para pets, o peso é usado para calcular a necessidade energética diária (NRC 2006: EM = 70 × peso^0.75 kcal/dia).
          </p>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            max="200"
            placeholder="Ex.: 10.5"
            value={pesoCorporal}
            onChange={(e) => onPesoChange(e.target.value)}
            className="max-w-xs"
          />
          {emDia && (
            <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm space-y-1">
              <div className="font-semibold text-primary">Estimativa de necessidade diária</div>
              <div>Energia de manutenção: <strong>{emDia.toFixed(0)} kcal/dia</strong></div>
              {racaoDiaKg && (
                <div>Ração estimada/dia: <strong>{(racaoDiaKg * 1000).toFixed(0)} g/dia</strong></div>
              )}
              <p className="text-xs text-muted-foreground">* Referência para manutenção. Ajuste conforme nível de atividade, gestação, lactação, etc.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepFeedType({
  specie,
  value,
  onChange,
}: {
  specie: Specie | null;
  value: FeedType | null;
  onChange: (v: FeedType) => void;
}) {
  const naturalAllowed = specie ? NATURAL_ALLOWED.includes(specie) : false;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Tipo de alimentação</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Escolha como o alimento será preparado.
      </p>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(v) => onChange(v as FeedType)}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FeedOption
          id="peletizada"
          title="Ração peletizada"
          desc="Formulação industrial em pellets."
          selected={value === "peletizada"}
        />
        <FeedOption
          id="natural"
          title="Alimentação natural"
          desc={
            naturalAllowed
              ? "Disponível para a espécie selecionada."
              : "Disponível apenas para cães, gatos, jabuti e calopsita."
          }
          selected={value === "natural"}
          disabled={!naturalAllowed}
        />
      </RadioGroup>
    </div>
  );
}

function FeedOption({
  id,
  title,
  desc,
  selected,
  disabled,
}: {
  id: string;
  title: string;
  desc: string;
  selected: boolean;
  disabled?: boolean;
}) {
  return (
    <Label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : selected
          ? "border-primary bg-primary/15"
          : "border-border bg-card/40 hover:border-primary/50"
      }`}
    >
      <RadioGroupItem id={id} value={id} disabled={disabled} className="mt-1" />
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </Label>
  );
}

function StepIngredients({
  search,
  setSearch,
  available,
  selected,
  onToggle,
}: {
  search: string;
  setSearch: (v: string) => void;
  available: IngredientRow[];
  selected: string[];
  onToggle: (ing: string) => void;
}) {
  const filtered = available.filter((i) =>
    i.nome.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Selecione os ingredientes</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {selected.length} selecionado(s) — lista vinda da aba <strong>Ingredientes</strong>.
      </p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          className="pl-9"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
        {available.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">
            Nenhum ingrediente cadastrado. Cadastre na aba <strong>Ingredientes</strong>.
          </p>
        )}
        {filtered.map((ing) => {
          const checked = selected.includes(ing.nome);
          return (
            <Label
              key={ing.id}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                checked
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card/40 hover:border-primary/50"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(ing.nome)} />
              <span className="flex-1">{ing.nome}</span>
              {ing.preco > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  R$ {ing.preco.toFixed(2)}/kg
                </span>
              )}
            </Label>
          );
        })}
        {available.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">
            Nenhum ingrediente encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

// ---- REFORMULADO: StepNutrients agora usa os nutrientes reais do banco ----
function StepNutrients({
  specie,
  categoria,
  requirements,
  selected,
  onToggle,
}: {
  specie: Specie | null;
  categoria: string;
  requirements: RequirementRow[];
  selected: string[];
  onToggle: (n: string) => void;
}) {
  // Nutrientes disponíveis na exigência cadastrada para a espécie/categoria
  const req = useMemo(
    () => findRequirementForCategory(requirements, specie, categoria),
    [requirements, specie, categoria],
  );

  const nutrientesDisp = useMemo(() => {
    if (!req) return [];
    return Object.entries(req.nutrientes)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([key]) => {
        const col = NUTRIENT_COLUMNS.find((c) => c.key === key);
        return { key, label: col?.label ?? key, unit: col?.unit ?? "" };
      });
  }, [req]);

  const todosNutrientes = useMemo(() => {
    // Se não há exigência, mostra todos os nutrientes do banco
    return NUTRIENT_COLUMNS.map((c) => ({ key: c.key, label: c.label, unit: c.unit }));
  }, []);

  const listaExibir = nutrientesDisp.length > 0 ? nutrientesDisp : todosNutrientes;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Selecione os nutrientes</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Quais nutrientes serão considerados na formulação?
      </p>
      {nutrientesDisp.length > 0 ? (
        <p className="text-xs text-primary mb-4">
          ✓ {nutrientesDisp.length} nutrientes encontrados nas exigências de <strong>{categoria}</strong>. Os selecionados terão o mínimo aplicado automaticamente.
        </p>
      ) : (
        <p className="text-xs text-yellow-600 mb-4">
          Nenhuma exigência cadastrada para esta categoria. Selecione os nutrientes manualmente e defina os limites na próxima etapa.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
        {listaExibir.map((n) => {
          const checked = selected.includes(n.key);
          return (
            <Label
              key={n.key}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                checked
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card/40 hover:border-primary/50"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(n.key)} />
              <div className="flex-1">
                <span className="text-sm">{n.label}</span>
                {n.unit && <span className="text-xs text-muted-foreground ml-1">({n.unit})</span>}
              </div>
              {req && req.nutrientes[n.key] > 0 && (
                <span className="text-xs text-primary tabular-nums">
                  mín: {req.nutrientes[n.key]}
                </span>
              )}
            </Label>
          );
        })}
      </div>
    </div>
  );
}

// ---- REFORMULADO: StepRestrictions usa chaves reais ----
function StepRestrictions({
  specie,
  requirements,
  categoria,
  ingredients,
  nutrients,
  ingredientLimits,
  nutrientLimits,
  setIngredientLimit,
  setNutrientLimit,
}: {
  specie: Specie | null;
  requirements: RequirementRow[];
  categoria: string;
  ingredients: string[];
  nutrients: string[];
  ingredientLimits: Record<string, Range>;
  nutrientLimits: Record<string, Range>;
  setIngredientLimit: (id: string, r: Range) => void;
  setNutrientLimit: (id: string, r: Range) => void;
}) {
  const especieReq = specie ? SPECIE_TO_REQ_ESPECIE[specie] : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Restrições</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Defina valores mínimo e máximo para cada nutriente e ingrediente.
        </p>
        {categoria && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm mb-2">
            <span className="text-primary font-medium">Categoria selecionada:</span>{" "}
            {categoria} {especieReq ? `(${especieReq})` : ""}
            <span className="text-muted-foreground text-xs ml-2">
              — mínimos carregados automaticamente
            </span>
          </div>
        )}
      </div>

      <section>
        <h3 className="font-medium mb-3">Nutrientes</h3>
        {nutrients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum nutriente selecionado.</p>
        ) : (
          <div className="space-y-3">
            {nutrients.map((key) => {
              const col = NUTRIENT_COLUMNS.find((c) => c.key === key);
              const label = col ? `${col.label} (${col.unit})` : key;
              const r = nutrientLimits[key] ?? { min: "", max: "" };
              return (
                <LimitRow
                  key={key}
                  label={label}
                  range={r}
                  onChange={(nr) => setNutrientLimit(key, nr)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-medium mb-3">Ingredientes (% inclusão)</h3>
        {ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ingrediente selecionado.</p>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ing) => {
              const r = ingredientLimits[ing] ?? { min: "", max: "" };
              return (
                <LimitRow
                  key={ing}
                  label={ing}
                  range={r}
                  onChange={(nr) => setIngredientLimit(ing, nr)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function LimitRow({
  label,
  range,
  onChange,
}: {
  label: string;
  range: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center rounded-lg border border-border bg-card/40 p-3">
      <span className="text-sm">{label}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="Mín"
        value={range.min}
        onChange={(e) => onChange({ ...range, min: e.target.value.replace(",", ".") })}
        className="w-full sm:w-28"
      />
      <Input
        type="text"
        inputMode="decimal"
        placeholder="Máx"
        value={range.max}
        onChange={(e) => onChange({ ...range, max: e.target.value.replace(",", ".") })}
        className="w-full sm:w-28"
      />
    </div>
  );
}

function StepCalcType({
  value,
  onChange,
}: {
  value: CalcType | null;
  onChange: (v: CalcType) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Tipo de cálculo</h2>
      <p className="text-sm text-muted-foreground mb-6">Como deseja calcular a formulação?</p>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(v) => onChange(v as CalcType)}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FeedOption
          id="automatico"
          title="Automático (Solver)"
          desc="O sistema usa Programação Linear (Simplex) para minimizar o custo respeitando as exigências nutricionais."
          selected={value === "automatico"}
        />
        <FeedOption
          id="manual"
          title="Manual"
          desc="Você define as proporções de cada ingrediente livremente."
          selected={value === "manual"}
        />
      </RadioGroup>
    </div>
  );
}

// ---- REFORMULADO: StepResult com mapeamento correto de chaves ----
function StepResult({
  state,
  ingredientsList,
  onSwitchToManual,
}: {
  state: WizardState;
  ingredientsList: IngredientRow[];
  onSwitchToManual: (seed: Record<string, number>) => void;
}) {
  const [resultado, setResultado] = useState<ResultadoFormulacao | null>(null);
  const [relaxado, setRelaxado] = useState<ResultadoFormulacao | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeAuto = state.calcType === "automatico";

  const executar = () => {
    setCalculando(true);
    setErro(null);
    try {
      // Casa ingredientes selecionados (por nome) com os cadastrados
      const selMap = new Map(ingredientsList.map((i) => [i.nome.toLowerCase(), i]));
      const ingredientes: IngredienteEntrada[] = state.ingredients.map((nome) => {
        const found = selMap.get(nome.toLowerCase());
        if (!found) {
          console.warn(`Ingrediente "${nome}" não encontrado no banco.`);
        }
        const limites = state.ingredientLimits[nome] ?? { min: "", max: "" };
        const min = limites.min !== "" ? Number(limites.min) : undefined;
        const max = limites.max !== "" ? Number(limites.max) : undefined;
        return {
          id: nome,
          nome,
          preco: found?.preco ?? 0,
          // Passa os nutrientes com as chaves reais do banco
          nutrientes: found?.nutrientes ?? {},
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        };
      });

      // Exigências usando as chaves reais do banco diretamente
      const exigencias: ExigenciaNutriente[] = state.nutrients.map((key) => {
        const col = NUTRIENT_COLUMNS.find((c) => c.key === key);
        const label = col?.label ?? key;
        const r = state.nutrientLimits[key] ?? { min: "", max: "" };
        const min = r.min !== "" ? Number(r.min) : undefined;
        const max = r.max !== "" ? Number(r.max) : undefined;
        return {
          key,
          label,
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        };
      });

      if (ingredientes.length === 0) {
        setErro("Nenhum ingrediente selecionado ou encontrado no banco.");
        return;
      }

      if (exigencias.length === 0) {
        setErro("Nenhum nutriente selecionado. Volte e selecione ao menos um nutriente.");
        return;
      }

      // Verifica se os ingredientes têm os nutrientes necessários
      const nutrientesPresentes = new Set(
        ingredientes.flatMap((ing) =>
          Object.entries(ing.nutrientes)
            .filter(([, v]) => Number(v) > 0)
            .map(([k]) => k)
        )
      );
      const nutrientesFaltantes = exigencias
        .filter((ex) => !nutrientesPresentes.has(ex.key))
        .map((ex) => ex.label ?? ex.key);

      if (nutrientesFaltantes.length > 0) {
        setErro(
          `Os seguintes nutrientes não possuem dados nos ingredientes selecionados: ${nutrientesFaltantes.join(", ")}. ` +
          `Preencha os valores nutricionais dos ingredientes ou remova esses nutrientes da formulação.`
        );
        return;
      }

      const r = calcularFormulaAutomatica(ingredientes, exigencias);
      setResultado(r);
      if (r.status === "infeasible") {
        // Tenta uma composição relaxada (sem exigências nutricionais) só para
        // dar um ponto de partida que o usuário possa ajustar manualmente.
        const exigSemLimites: ExigenciaNutriente[] = exigencias.map((e) => ({
          key: e.key,
          label: e.label,
        }));
        const rel = calcularFormulaAutomatica(ingredientes, exigSemLimites);
        setRelaxado(rel);
      } else {
        setRelaxado(null);
      }
    } catch (e) {
      console.error("Erro no cálculo:", e);
      setErro("Ocorreu um erro inesperado no cálculo. Verifique o console para detalhes.");
    } finally {
      setCalculando(false);
    }
  };

  const totalPercent = resultado?.status === "ok"
    ? resultado.composicao.reduce((a, c) => a + c.percentual, 0)
    : 0;

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <div
          className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Resultado da formulação</h2>
        <p className="text-muted-foreground">
          Otimizador Simplex: minimiza o custo atendendo todas as exigências nutricionais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="text-left space-y-2 text-sm bg-card/40 border border-border rounded-lg p-4">
          <Row label="Espécie" value={state.specie ?? "—"} />
          <Row label="Categoria" value={state.categoria || "—"} />
          <Row label="Tipo" value={state.feedType ?? "—"} />
          <Row label="Ingredientes" value={`${state.ingredients.length} selecionado(s)`} />
          <Row label="Nutrientes" value={`${state.nutrients.length} selecionado(s)`} />
          {state.pesoCorporal && <Row label="Peso corporal" value={`${state.pesoCorporal} kg`} />}
        </div>

        <div className="flex flex-col gap-3 items-stretch justify-center bg-card/40 border border-border rounded-lg p-4">
          <Button
            onClick={executar}
            disabled={!podeAuto || calculando || state.ingredients.length === 0}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {calculando ? "Calculando..." : "Calcular automaticamente"}
          </Button>
          {!podeAuto && (
            <p className="text-xs text-muted-foreground">
              Selecione "Automático" na etapa de cálculo para usar o otimizador Simplex.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            O solver minimiza o custo (R$/kg) respeitando os limites mínimos/máximos de nutrientes e ingredientes.
          </p>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive p-4 text-sm mb-4">
          <div className="font-semibold mb-1">Erro na formulação</div>
          {erro}
        </div>
      )}

      {resultado?.status === "infeasible" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive p-4 text-sm">
          <div className="font-semibold mb-1">Formulação inviável</div>
          {resultado.mensagem}
          <div className="mt-2 text-xs opacity-80">
            Sugestões: amplie os limites máximos dos ingredientes, reduza as exigências mínimas, ou adicione mais ingredientes.
          </div>
        </div>
      )}

      {resultado?.status === "ok" && (
        <div className="space-y-5">
          <div className="bg-card/40 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Composição da fórmula</h3>
              <span className={`text-xs px-2 py-1 rounded-md border ${
                Math.abs(totalPercent - 100) < 0.1
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
                  : "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
              }`}>
                Total: {totalPercent.toFixed(2)}%
              </span>
            </div>
            <div className="space-y-2">
              {resultado.composicao
                .slice()
                .sort((a, b) => b.percentual - a.percentual)
                .map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span>{c.nome}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-border rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, c.percentual)}%` }}
                        />
                      </div>
                      <span className="font-medium w-14 text-right">{c.percentual.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 flex justify-between text-sm font-semibold">
              <span>Custo final</span>
              <span>R$ {resultado.custo.toFixed(4)} / kg</span>
            </div>
          </div>

          <div className="bg-card/40 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Composição nutricional</h3>
            <div className="space-y-2 text-sm">
              {resultado.nutrientes.map((n) => (
                <div
                  key={n.key}
                  className={`flex justify-between items-center rounded-md border px-3 py-2 ${
                    n.atendido
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  <div>
                    <span className="font-medium">{n.label ?? n.key}</span>
                    <div className="text-xs opacity-70">
                      {typeof n.min === "number" && <>mín: {n.min} </>}
                      {typeof n.max === "number" && <>· máx: {n.max}</>}
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{n.valor.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          {resultado.alertas.length > 0 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
              <div className="font-semibold mb-2">Alertas</div>
              <ul className="list-disc pl-5 space-y-1">
                {resultado.alertas.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

// ---------- Ajuste manual ----------

function StepResultManual({ state, ingredientsList }: { state: WizardState; ingredientsList: IngredientRow[] }) {
  // Resolve dados de cada ingrediente selecionado
  const ingredientesData = useMemo(() => {
    const selMap = new Map(ingredientsList.map((i) => [i.nome.toLowerCase(), i]));
    return state.ingredients.map((nome) => {
      const found = selMap.get(nome.toLowerCase());
      return {
        nome,
        preco: found?.preco ?? 0,
        nutrientes: found?.nutrientes ?? {},
      };
    });
  }, [ingredientsList, state.ingredients]);

  // Percentual por ingrediente (inicializa distribuído igualmente)
  const [percent, setPercent] = useState<Record<string, number>>({});
  useEffect(() => {
    setPercent((prev) => {
      const keys = state.ingredients;
      if (keys.length === 0) return {};
      const allPresent = keys.every((k) => k in prev);
      if (allPresent && Object.keys(prev).length === keys.length) return prev;
      const eq = 100 / keys.length;
      const next: Record<string, number> = {};
      keys.forEach((k, i) => {
        next[k] = i === keys.length - 1 ? 100 - eq * (keys.length - 1) : eq;
      });
      return next;
    });
  }, [state.ingredients]);

  const updatePercent = (nome: string, novo: number) => {
    setPercent((prev) => ({ ...prev, [nome]: Number.isFinite(novo) ? novo : 0 }));
  };

  const total = state.ingredients.reduce((a, k) => a + (percent[k] ?? 0), 0);

  const custo = useMemo(() => {
    return ingredientesData.reduce(
      (acc, ing) => acc + ((percent[ing.nome] ?? 0) / 100) * ing.preco,
      0,
    );
  }, [ingredientesData, percent]);

  // Usa chaves reais do banco diretamente
  const nutrientesCalc = useMemo(() => {
    return state.nutrients.map((key) => {
      const col = NUTRIENT_COLUMNS.find((c) => c.key === key);
      const label = col?.label ?? key;
      const valor = ingredientesData.reduce((acc, ing) => {
        const pct = percent[ing.nome] ?? 0;
        const v = Number(ing.nutrientes?.[key]) || 0;
        return acc + (v * pct) / 100;
      }, 0);
      const r = state.nutrientLimits[key] ?? { min: "", max: "" };
      const min = r.min !== "" ? Number(r.min) : undefined;
      const max = r.max !== "" ? Number(r.max) : undefined;
      let status: "ok" | "warn" | "bad" = "ok";
      if (typeof min === "number" && Number.isFinite(min)) {
        if (valor < min) status = "bad";
        else if (valor < min * 1.05) status = "warn";
      }
      if (typeof max === "number" && Number.isFinite(max)) {
        if (valor > max) status = "bad";
        else if (valor > max * 0.95 && status === "ok") status = "warn";
      }
      return { key, label, valor, min, max, status };
    });
  }, [ingredientesData, percent, state.nutrients, state.nutrientLimits]);

  const statusColor = (s: "ok" | "warn" | "bad") =>
    s === "ok"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
      : s === "warn"
      ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
      : "bg-destructive/15 text-destructive border-destructive/40";

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Ajuste manual</h2>
        <p className="text-muted-foreground text-sm">
          Ajuste livremente a porcentagem de cada ingrediente. A soma pode ficar acima ou abaixo de 100%.
        </p>
      </div>

      {state.ingredients.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center">
          Nenhum ingrediente selecionado.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-card/40 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Ingredientes</h3>
              <span
                className={`text-xs px-2 py-1 rounded-md border ${
                  Math.abs(total - 100) < 0.05
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
                    : "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
                }`}
              >
                Total: {total.toFixed(2)}%
              </span>
            </div>
            <div className="space-y-4">
              {ingredientesData.map((ing) => {
                const v = percent[ing.nome] ?? 0;
                const lim = state.ingredientLimits[ing.nome] ?? { min: "", max: "" };
                return (
                  <div key={ing.nome} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-medium">{ing.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {ing.preco.toFixed(4)}/kg
                          {(lim.min || lim.max) && (
                            <>
                              {" "}· limites {lim.min || 0}–{lim.max || 100}%
                            </>
                          )}
                        </div>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={v.toFixed(2)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".");
                          const n = parseFloat(raw);
                          updatePercent(ing.nome, Number.isFinite(n) ? n : 0);
                        }}
                        className="w-24 text-right"
                      />
                    </div>
                    <Slider
                      value={[Math.min(100, Math.max(0, v))]}
                      min={0}
                      max={100}
                      step={0.1}
                      onValueChange={(arr) => updatePercent(ing.nome, arr[0] ?? 0)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border mt-4 pt-3 flex justify-between text-sm font-semibold">
              <span>Custo final</span>
              <span>R$ {custo.toFixed(4)} / kg</span>
            </div>
          </div>

          <div className="bg-card/40 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Composição nutricional</h3>
            {nutrientesCalc.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum nutriente selecionado.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {nutrientesCalc.map((n) => (
                  <div
                    key={n.key}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${statusColor(n.status)}`}
                  >
                    <div>
                      <div className="font-medium">{n.label}</div>
                      <div className="text-xs opacity-80">
                        {typeof n.min === "number" && <>mín {n.min} </>}
                        {typeof n.max === "number" && <>· máx {n.max}</>}
                        {typeof n.min !== "number" && typeof n.max !== "number" && (
                          <>sem exigência definida</>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{n.valor.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Atendido
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Próximo do limite
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Fora da exigência
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
