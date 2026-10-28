// Open Food Facts: busca por código de barras e por nome (Brasil) + normalização para foods.

const OFF_WORLD = "https://world.openfoodfacts.org";
const OFF_SEARCH = "https://search.openfoodfacts.org/search";
const FIELDS = "code,product_name,product_name_pt,brands,nutriments,serving_quantity,serving_size,countries_tags,categories_tags";

type Brands = string | string[] | undefined;
export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: Brands;
  nutriments?: Record<string, number | string | undefined>;
  serving_quantity?: number | string;
  serving_size?: string;
  countries_tags?: string[];
};

export type OffFood = {
  name: string;
  brand: string | null;
  barcode: string | null;
  food_group: string | null;
  base_g: 100;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
  serving_g: number | null;
  serving_label: string | null;
  source: "off";
  source_ref: string | null;
  source_url: string | null;
  verified: false;
};

const n = (v: unknown): number | null => {
  const x = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) && x >= 0 ? x : null;
};
const r2 = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);

/** Normaliza produto OFF (valores por 100 g). null = sem nome/energia ou dados impossíveis. */
export function offToFood(p: OffProduct): OffFood | null {
  const name = (p.product_name_pt || p.product_name || "").trim();
  const nu = p.nutriments ?? {};
  let kcal = n(nu["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = n(nu["energy-kj_100g"]) ?? n(nu["energy_100g"]);
    kcal = kj == null ? null : kj / 4.184;
  }
  if (!name || kcal == null) return null;

  const protein = n(nu.proteins_100g);
  const carbs = n(nu.carbohydrates_100g);
  const fat = n(nu.fat_100g);
  const fiber = n(nu.fiber_100g);
  // Dados quebrados (ex.: macros por embalagem em vez de 100 g)
  if ((protein ?? 0) + (carbs ?? 0) + (fat ?? 0) > 101 || kcal > 950) return null;

  let sodium = n(nu.sodium_100g);
  if (sodium == null) {
    const salt = n(nu.salt_100g);
    sodium = salt == null ? null : salt / 2.5;
  }
  const brand = Array.isArray(p.brands) ? p.brands.join(", ") : p.brands;
  const servingG = n(p.serving_quantity);

  return {
    name: name.slice(0, 200),
    brand: brand?.trim() || null,
    barcode: p.code && /^\d{6,14}$/.test(p.code) ? p.code : null,
    food_group: null,
    base_g: 100,
    kcal: Math.round(kcal * 10) / 10,
    protein: r2(protein),
    carbs: r2(carbs),
    fat: r2(fat),
    fiber: r2(fiber),
    sodium_mg: sodium == null ? null : Math.round(sodium * 1000 * 10) / 10,
    serving_g: servingG && servingG > 0 ? servingG : null,
    serving_label: p.serving_size?.trim() || null,
    source: "off",
    source_ref: p.code ?? null,
    source_url: p.code ? `${OFF_WORLD}/product/${p.code}` : null,
    verified: false,
  };
}

function headers() {
  return { "User-Agent": process.env.OFF_USER_AGENT || "Treinos/0.1 (sem-contato)", Accept: "application/json" };
}

export async function offByBarcode(code: string, signal?: AbortSignal): Promise<OffFood | null> {
  const res = await fetch(`${OFF_WORLD}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
    headers: headers(),
    signal,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { status?: number; product?: OffProduct };
  if (!j.product) return null;
  return offToFood({ ...j.product, code: j.product.code ?? code });
}

/** Busca por nome restrita a produtos vendidos no Brasil. */
export async function offSearch(q: string, limit = 10, signal?: AbortSignal): Promise<OffFood[]> {
  const url = new URL(OFF_SEARCH);
  url.searchParams.set("q", `${q} countries_tags:"en:brazil"`);
  url.searchParams.set("langs", "pt");
  url.searchParams.set("page_size", String(limit * 2));
  url.searchParams.set("fields", FIELDS);
  const res = await fetch(url, { headers: headers(), signal, cache: "no-store" });
  if (!res.ok) return [];
  const j = (await res.json()) as { hits?: OffProduct[] };
  const out: OffFood[] = [];
  for (const h of j.hits ?? []) {
    const f = offToFood(h);
    if (f) out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}
