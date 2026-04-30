import { solve, lessEq, greaterEq, equalTo, type Model } from "yalps";

/**
 * Motor de formulação automática de rações via Programação Linear.
 * Independente da UI — recebe dados puros e retorna um resultado tipado.
 */

export interface IngredienteEntrada {
  /** Identificador único (id ou nome) */
  id: string;
  nome: string;
  /** Preço por kg (R$) */
  preco: number;
  /** Mapa de nutrientes: chave -> valor por kg do ingrediente (ex.: % ou kcal/kg) */
  nutrientes: Record<string, number>;
  /** Limite mínimo de inclusão (%) — opcional, default 0 */
  min?: number;
  /** Limite máximo de inclusão (%) — opcional, default 100 */
  max?: number;
}

export interface ExigenciaNutriente {
  /** Chave do nutriente (deve casar com as chaves usadas nos ingredientes) */
  key: string;
  label?: string;
  /** Valor mínimo exigido (na mesma unidade do ingrediente) */
  min?: number;
  /** Valor máximo permitido (opcional) */
  max?: number;
}

export interface FormulacaoOk {
  status: "ok";
  /** Percentual de cada ingrediente (0-100), somando 100 */
  composicao: { id: string; nome: string; percentual: number }[];
  /** Composição nutricional final */
  nutrientes: { key: string; label?: string; valor: number; min?: number; max?: number; atendido: boolean }[];
  /** Custo final por kg (R$) */
  custo: number;
  alertas: string[];
}

export interface FormulacaoErro {
  status: "infeasible";
  mensagem: string;
}

export type ResultadoFormulacao = FormulacaoOk | FormulacaoErro;

const MSG_INFEASIVEL =
  "Não foi possível formular com os ingredientes e restrições selecionados. Ajuste os limites ou adicione novos ingredientes.";

/**
 * Calcula a formulação de menor custo respeitando exigências nutricionais
 * e limites de inclusão dos ingredientes.
 *
 * Modelo (variáveis em %, soma = 100):
 *  - minimizar  Σ (preco_i / 100) * x_i
 *  - sujeito a  Σ x_i = 100
 *  - para cada nutriente n com mínimo: Σ (nutr_i,n / 100) * x_i ≥ min_n
 *  - para cada nutriente n com máximo: Σ (nutr_i,n / 100) * x_i ≤ max_n
 *  - min_i ≤ x_i ≤ max_i
 */
export function calcularFormulaAutomatica(
  ingredientes: IngredienteEntrada[],
  exigencias: ExigenciaNutriente[],
): ResultadoFormulacao {
  if (ingredientes.length === 0) {
    return { status: "infeasible", mensagem: MSG_INFEASIVEL };
  }

  const variables: Record<string, Record<string, number>> = {};
  for (const ing of ingredientes) {
    const v: Record<string, number> = {
      custo: (Number(ing.preco) || 0) / 100,
      total: 1,
    };
    for (const ex of exigencias) {
      const valor = Number(ing.nutrientes?.[ex.key]) || 0;
      v[`nutr_${ex.key}`] = valor / 100;
    }
    variables[ing.id] = v;
  }

  const constraints: Record<string, ReturnType<typeof equalTo>> = {
    total: equalTo(100),
  };
  for (const ex of exigencias) {
    if (typeof ex.min === "number" && !Number.isNaN(ex.min)) {
      constraints[`min_${ex.key}`] = greaterEq(ex.min);
      // adiciona variável presente no constraint
      for (const id of Object.keys(variables)) {
        variables[id][`min_${ex.key}`] = variables[id][`nutr_${ex.key}`] ?? 0;
      }
    }
    if (typeof ex.max === "number" && !Number.isNaN(ex.max)) {
      constraints[`max_${ex.key}`] = lessEq(ex.max);
      for (const id of Object.keys(variables)) {
        variables[id][`max_${ex.key}`] = variables[id][`nutr_${ex.key}`] ?? 0;
      }
    }
  }

  // Bounds por ingrediente (min/max %)
  const bounds: Record<string, { min?: number; max?: number }> = {};
  for (const ing of ingredientes) {
    const b: { min?: number; max?: number } = {};
    if (typeof ing.min === "number" && ing.min > 0) b.min = ing.min;
    if (typeof ing.max === "number" && ing.max < 100) b.max = ing.max;
    if (b.min !== undefined || b.max !== undefined) bounds[ing.id] = b;
  }

  const model: Model = {
    direction: "minimize",
    objective: "custo",
    constraints,
    variables,
    ...(Object.keys(bounds).length ? { bounds } : {}),
  };

  const sol = solve(model);

  if (sol.status === "infeasible" || sol.status === "unbounded" || sol.status === "cycled") {
    return { status: "infeasible", mensagem: MSG_INFEASIVEL };
  }

  const map = new Map<string, number>(sol.variables as [string, number][]);
  const composicao = ingredientes.map((ing) => ({
    id: ing.id,
    nome: ing.nome,
    percentual: Math.max(0, map.get(ing.id) ?? 0),
  }));

  const alertas: string[] = [];
  const nutrientesResult = exigencias.map((ex) => {
    const valor = ingredientes.reduce((acc, ing) => {
      const pct = map.get(ing.id) ?? 0;
      const v = Number(ing.nutrientes?.[ex.key]) || 0;
      return acc + (v * pct) / 100;
    }, 0);
    let atendido = true;
    if (typeof ex.min === "number" && valor + 1e-6 < ex.min) {
      atendido = false;
      alertas.push(`${ex.label ?? ex.key}: abaixo do mínimo (${valor.toFixed(2)} < ${ex.min}).`);
    }
    if (typeof ex.max === "number" && valor - 1e-6 > ex.max) {
      atendido = false;
      alertas.push(`${ex.label ?? ex.key}: acima do máximo (${valor.toFixed(2)} > ${ex.max}).`);
    }
    return { key: ex.key, label: ex.label, valor, min: ex.min, max: ex.max, atendido };
  });

  const custo = sol.result;

  return {
    status: "ok",
    composicao,
    nutrientes: nutrientesResult,
    custo,
    alertas,
  };
}
