import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { offByBarcode, offSearch, type OffFood } from "@/lib/off";
import type { Food } from "@/lib/types";

const OFF_TIMEOUT_MS = 6000;
const MIN_LOCAL_RESULTS = 5;

/** Cache: grava resultados do OFF em foods (source='off', verified=false). Retorna as linhas salvas/existentes. */
async function cacheOff(supabase: SupabaseClient, userId: string, items: OffFood[]): Promise<Food[]> {
  const withCode = items.filter((i) => i.barcode);
  if (!withCode.length) return [];
  await supabase
    .from("foods")
    .upsert(
      withCode.map((i) => ({ ...i, created_by: userId })),
      { onConflict: "barcode", ignoreDuplicates: true },
    );
  const { data } = await supabase.from("foods").select("*").in("barcode", withCode.map((i) => i.barcode!));
  return (data as Food[]) ?? [];
}

/** Cascata: foods local (full text pt/unaccent) → Open Food Facts (Brasil) → cache em foods. */
export async function searchFoods(
  supabase: SupabaseClient,
  userId: string,
  q: string,
  opts: { remote?: boolean } = {},
): Promise<{ foods: Food[]; remote: boolean }> {
  const query = q.trim();
  if (!query) return { foods: [], remote: false };
  if (/^\d{8,14}$/.test(query)) {
    const f = await findByBarcode(supabase, userId, query);
    return { foods: f ? [f] : [], remote: false };
  }

  const { data } = await supabase.rpc("search_foods", { q: query, lim: 25 });
  const local = (data as Food[]) ?? [];
  const wantRemote = opts.remote ?? (local.length < MIN_LOCAL_RESULTS && query.length >= 3);
  if (!wantRemote) return { foods: local, remote: false };

  try {
    const remote = await offSearch(query, 10, AbortSignal.timeout(OFF_TIMEOUT_MS));
    const cached = await cacheOff(supabase, userId, remote);
    const seen = new Set(local.map((f) => f.id));
    return { foods: [...local, ...cached.filter((f) => !seen.has(f.id))], remote: true };
  } catch {
    return { foods: local, remote: false };
  }
}

export async function findByBarcode(supabase: SupabaseClient, userId: string, code: string): Promise<Food | null> {
  const { data } = await supabase.from("foods").select("*").eq("barcode", code).maybeSingle();
  if (data) return data as Food;
  try {
    const off = await offByBarcode(code, AbortSignal.timeout(OFF_TIMEOUT_MS));
    if (!off) return null;
    const [saved] = await cacheOff(supabase, userId, [off]);
    return saved ?? null;
  } catch {
    return null;
  }
}
