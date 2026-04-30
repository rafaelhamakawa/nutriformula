import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogoLoader } from "@/components/logo-loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Sparkles,
} from "lucide-react";
import logo from "@/assets/logo.png";
import iconFormular from "@/assets/dashboard/formular.png";
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
  | "jabuti";

type FeedType = "peletizada" | "natural";
type CalcType = "automatico" | "manual";

interface Range {
  min: string;
  max: string;
}

interface WizardState {
  specie: Specie | null;
  feedType: FeedType | null;
  ingredients: string[];
  nutrients: string[];
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
];

const NATURAL_ALLOWED: Specie[] = ["caes", "gatos", "jabuti", "calopsita"];

const INGREDIENTS = [
  "Milho moído",
  "Farelo de soja",
  "Farelo de trigo",
  "Sorgo",
  "Farinha de carne",
  "Farinha de peixe",
  "Óleo de soja",
  "Calcário calcítico",
  "Fosfato bicálcico",
  "Sal comum",
  "DL-Metionina",
  "L-Lisina",
  "Premix vitamínico",
  "Premix mineral",
];

const NUTRIENTS = [
  { id: "proteina", label: "Proteína bruta" },
  { id: "energia", label: "Energia metabolizável" },
  { id: "lisina", label: "Lisina (aminoácido)" },
  { id: "metionina", label: "Metionina (aminoácido)" },
  { id: "calcio", label: "Cálcio (mineral)" },
  { id: "fosforo", label: "Fósforo (mineral)" },
];

const STEPS = [
  "Espécie",
  "Tipo de alimentação",
  "Ingredientes",
  "Nutrientes",
  "Restrições",
  "Cálculo",
  "Resultado",
];

// ---------- Component ----------

function FormularRacaoWizard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    specie: null,
    feedType: null,
    ingredients: [],
    nutrients: [],
    ingredientLimits: {},
    nutrientLimits: {},
    calcType: null,
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <LogoLoader label="Preparando o formulador..." />;
  }

  const canNext = (() => {
    switch (step) {
      case 0: return !!state.specie;
      case 1: return !!state.feedType;
      case 2: return state.ingredients.length > 0;
      case 3: return state.nutrients.length > 0;
      case 4: return true;
      case 5: return !!state.calcType;
      default: return true;
    }
  })();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

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
            <StepFeedType
              specie={state.specie}
              value={state.feedType}
              onChange={(v) => {
                setState((s) => ({ ...s, feedType: v }));
                next();
              }}
            />
          )}

          {step === 2 && (
            <StepIngredients
              search={search}
              setSearch={setSearch}
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

          {step === 3 && (
            <StepNutrients
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

          {step === 4 && (
            <StepRestrictions
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

          {step === 5 && (
            <StepCalcType
              value={state.calcType}
              onChange={(v) => {
                setState((s) => ({ ...s, calcType: v }));
                next();
              }}
            />
          )}

          {step === 6 && <StepResult state={state} />}
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
  selected,
  onToggle,
}: {
  search: string;
  setSearch: (v: string) => void;
  selected: string[];
  onToggle: (ing: string) => void;
}) {
  const filtered = INGREDIENTS.filter((i) =>
    i.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Selecione os ingredientes</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {selected.length} selecionado(s).
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
        {filtered.map((ing) => {
          const checked = selected.includes(ing);
          return (
            <Label
              key={ing}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                checked
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card/40 hover:border-primary/50"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(ing)} />
              <span>{ing}</span>
            </Label>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">
            Nenhum ingrediente encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

function StepNutrients({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (n: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Selecione os nutrientes</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Quais nutrientes serão considerados na formulação?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {NUTRIENTS.map((n) => {
          const checked = selected.includes(n.id);
          return (
            <Label
              key={n.id}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                checked
                  ? "border-primary bg-primary/15"
                  : "border-border bg-card/40 hover:border-primary/50"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(n.id)} />
              <span>{n.label}</span>
            </Label>
          );
        })}
      </div>
    </div>
  );
}

function StepRestrictions({
  ingredients,
  nutrients,
  ingredientLimits,
  nutrientLimits,
  setIngredientLimit,
  setNutrientLimit,
}: {
  ingredients: string[];
  nutrients: string[];
  ingredientLimits: Record<string, Range>;
  nutrientLimits: Record<string, Range>;
  setIngredientLimit: (id: string, r: Range) => void;
  setNutrientLimit: (id: string, r: Range) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Restrições</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Defina valores mínimo e máximo (opcional).
        </p>
      </div>

      <section>
        <h3 className="font-medium mb-3">Nutrientes</h3>
        {nutrients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum nutriente selecionado.</p>
        ) : (
          <div className="space-y-3">
            {nutrients.map((id) => {
              const label = NUTRIENTS.find((n) => n.id === id)?.label ?? id;
              const r = nutrientLimits[id] ?? { min: "", max: "" };
              return (
                <LimitRow
                  key={id}
                  label={label}
                  range={r}
                  onChange={(nr) => setNutrientLimit(id, nr)}
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
        type="number"
        placeholder="Mín"
        value={range.min}
        onChange={(e) => onChange({ ...range, min: e.target.value })}
        className="w-full sm:w-28"
      />
      <Input
        type="number"
        placeholder="Máx"
        value={range.max}
        onChange={(e) => onChange({ ...range, max: e.target.value })}
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
          title="Automático"
          desc="O sistema otimiza com base nas restrições."
          selected={value === "automatico"}
        />
        <FeedOption
          id="manual"
          title="Manual"
          desc="Você define as proporções."
          selected={value === "manual"}
        />
      </RadioGroup>
    </div>
  );
}

// Mapeia chaves "amigáveis" do wizard para chaves reais dos nutrientes do banco.
const WIZARD_TO_NUTRIENT_KEY: Record<string, string> = {
  proteina: "proteina_bruta",
  energia: "energia_metabolizavel",
  lisina: "lisina_dig",
  metionina: "met_cist_dig",
  calcio: "calcio",
  fosforo: "fosforo_dig",
};

function StepResult({ state }: { state: WizardState }) {
  const [items] = useSupabaseCollection<
    {
      id: string;
      nome: string;
      preco: number;
      nutrientes: Record<string, number>;
    },
    {
      id: string;
      user_id: string;
      nome: string;
      preco: number | null;
      nutrientes: Record<string, number> | null;
    }
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

  const [resultado, setResultado] = useState<ResultadoFormulacao | null>(null);
  const [calculando, setCalculando] = useState(false);

  const podeAuto = state.calcType === "automatico";

  const executar = () => {
    setCalculando(true);
    try {
      // Casa ingredientes selecionados (por nome) com os cadastrados.
      const selMap = new Map(items.map((i) => [i.nome.toLowerCase(), i]));
      const ingredientes: IngredienteEntrada[] = state.ingredients.map((nome) => {
        const found = selMap.get(nome.toLowerCase());
        const limites = state.ingredientLimits[nome] ?? { min: "", max: "" };
        const min = limites.min !== "" ? Number(limites.min) : undefined;
        const max = limites.max !== "" ? Number(limites.max) : undefined;
        return {
          id: nome,
          nome,
          preco: found?.preco ?? 0,
          nutrientes: found?.nutrientes ?? {},
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        };
      });

      const exigencias: ExigenciaNutriente[] = state.nutrients.map((wid) => {
        const key = WIZARD_TO_NUTRIENT_KEY[wid] ?? wid;
        const label = NUTRIENTS.find((n) => n.id === wid)?.label ?? key;
        const r = state.nutrientLimits[wid] ?? { min: "", max: "" };
        const min = r.min !== "" ? Number(r.min) : undefined;
        const max = r.max !== "" ? Number(r.max) : undefined;
        return {
          key,
          label,
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        };
      });

      const r = calcularFormulaAutomatica(ingredientes, exigencias);
      setResultado(r);
    } finally {
      setCalculando(false);
    }
  };

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
          Revise as escolhas e calcule a fórmula otimizada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="text-left space-y-2 text-sm bg-card/40 border border-border rounded-lg p-4">
          <Row label="Espécie" value={state.specie ?? "—"} />
          <Row label="Tipo" value={state.feedType ?? "—"} />
          <Row label="Ingredientes" value={`${state.ingredients.length} selecionado(s)`} />
          <Row label="Nutrientes" value={`${state.nutrients.length} selecionado(s)`} />
          <Row label="Cálculo" value={state.calcType ?? "—"} />
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
              Selecione "Automático" na etapa de cálculo para usar o otimizador.
            </p>
          )}
        </div>
      </div>

      {resultado?.status === "infeasible" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive p-4 text-sm">
          {resultado.mensagem}
        </div>
      )}

      {resultado?.status === "ok" && (
        <div className="space-y-5">
          <div className="bg-card/40 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Composição da fórmula</h3>
            <div className="space-y-2">
              {resultado.composicao
                .slice()
                .sort((a, b) => b.percentual - a.percentual)
                .map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.nome}</span>
                    <span className="font-medium">{c.percentual.toFixed(2)}%</span>
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
                <div key={n.key} className="flex justify-between">
                  <span className={n.atendido ? "" : "text-destructive"}>
                    {n.label ?? n.key}
                    {typeof n.min === "number" && (
                      <span className="text-muted-foreground"> (min {n.min})</span>
                    )}
                    {typeof n.max === "number" && (
                      <span className="text-muted-foreground"> (max {n.max})</span>
                    )}
                  </span>
                  <span className="font-medium">{n.valor.toFixed(3)}</span>
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
