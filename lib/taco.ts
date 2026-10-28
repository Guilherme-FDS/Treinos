// Mapeamento linha de data/taco.csv → registro de foods.

export type TacoFood = {
  name: string;
  food_group: string;
  base_g: number;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
  source: "taco";
  source_ref: string;
  source_url: string;
  verified: true;
};

export const TACO_URL = "https://nepa.unicamp.br/publicacoes/tabela-taco-pdf/";

/** Campo vazio = NULL (não medido, NA ou *). Traço (Tr) já vem como 0. */
export function num(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Retorna null para linhas sem kcal (ex.: Coco verde). kcal_divergente é descartado. */
export function tacoRowToFood(r: Record<string, string>): TacoFood | null {
  const kcal = num(r.kcal);
  if (kcal == null || !r.taco_id) return null;
  return {
    name: r.name.trim(),
    food_group: r.group,
    base_g: num(r.base_g) ?? 100,
    kcal,
    protein: num(r.protein),
    carbs: num(r.carbs), // total, inclui fibra
    fat: num(r.fat),
    fiber: num(r.fiber),
    sodium_mg: num(r.sodium_mg),
    source: "taco",
    source_ref: r.taco_id,
    source_url: TACO_URL,
    verified: true,
  };
}
