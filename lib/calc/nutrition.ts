// Escala de macros por gramas e validação de kcal declarada.

export type Nutrients = {
  kcal: number;
  protein: number | null;
  carbs: number | null; // total, inclui fibra
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
};

export type FoodLike = Nutrients & { base_g: number; source?: string };

/** Macros para `grams` de um alimento expresso por `base_g` (normalmente 100 g). */
export function scaleNutrients(food: FoodLike, grams: number): Nutrients {
  const k = grams / (food.base_g || 100);
  const s = (v: number | null) => (v == null ? null : round2(v * k));
  return {
    kcal: round1(food.kcal * k),
    protein: s(food.protein),
    carbs: s(food.carbs),
    fat: s(food.fat),
    fiber: s(food.fiber),
    sodium_mg: food.sodium_mg == null ? null : round1(food.sodium_mg * k),
  };
}

export type Totals = { [K in keyof Nutrients]: number };

export function sumNutrients(items: Partial<Nutrients>[]): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium_mg: 0 };
  for (const i of items) {
    t.kcal += Number(i.kcal ?? 0);
    t.protein += Number(i.protein ?? 0);
    t.carbs += Number(i.carbs ?? 0);
    t.fat += Number(i.fat ?? 0);
    t.fiber += Number(i.fiber ?? 0);
    t.sodium_mg += Number(i.sodium_mg ?? 0);
  }
  return {
    kcal: round1(t.kcal),
    protein: round1(t.protein),
    carbs: round1(t.carbs),
    fat: round1(t.fat),
    fiber: round1(t.fiber),
    sodium_mg: round1(t.sodium_mg),
  };
}

/** kcal estimada = 4P + 4(C - fibra) + 2*fibra + 9G. */
export function estimateKcal(n: Pick<Nutrients, "protein" | "carbs" | "fat" | "fiber">): number {
  const p = n.protein ?? 0;
  const c = n.carbs ?? 0;
  const f = n.fat ?? 0;
  const fib = Math.min(n.fiber ?? 0, c);
  return 4 * p + 4 * (c - fib) + 2 * fib + 9 * f;
}

export const KCAL_DIVERGENCE_LIMIT = 0.15;
// Abaixo disso a divergência relativa vira ruído de arredondamento
const MIN_ABS_DIFF_KCAL = 10;

export type KcalCheck = { estimated: number; divergence: number; suspect: boolean };

/** Divergência > 15% entre kcal declarada e estimada → suspeito. Não se aplica à TACO. */
export function checkKcal(food: FoodLike): KcalCheck {
  const estimated = estimateKcal(food);
  const diff = Math.abs(food.kcal - estimated);
  const divergence = food.kcal > 0 ? diff / food.kcal : estimated > 0 ? 1 : 0;
  const hasMacros = food.protein != null || food.carbs != null || food.fat != null;
  const suspect =
    food.source !== "taco" && hasMacros && diff >= MIN_ABS_DIFF_KCAL && divergence > KCAL_DIVERGENCE_LIMIT;
  return { estimated: round1(estimated), divergence, suspect };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
