"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { scaleNutrients } from "@/lib/calc";
import { addDays, isIsoDate } from "@/lib/dates";
import { firstError, formToObject, mealItemSchema, waterSchema } from "@/lib/schemas";
import type { Food, MealItem, MealType } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";

async function ensureMeal(supabase: SupabaseClient, userId: string, day: string, type: MealType): Promise<string> {
  const { data, error } = await supabase
    .from("meals")
    .upsert({ user_id: userId, eaten_on: day, meal_type: type }, { onConflict: "user_id,eaten_on,meal_type" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function snapshot(items: MealItem[], mealId: string, userId: string) {
  return items.map(({ id: _id, meal_id: _m, ...rest }) => ({ ...rest, meal_id: mealId, user_id: userId }));
}

const ITEM_COLS = "id, meal_id, food_id, food_name, grams, serving_qty, serving_label, kcal, protein, carbs, fat, fiber, sodium_mg";

export async function addMealItem(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = mealItemSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const { data: food } = await supabase.from("foods").select("*").eq("id", v.food_id).single();
  if (!food) return { error: "Alimento não encontrado." };
  const f = food as Food;

  const mealId = await ensureMeal(supabase, user.id, v.eaten_on, v.meal_type);
  const n = scaleNutrients({ ...f, base_g: Number(f.base_g) }, v.grams);
  const { error } = await supabase.from("meal_items").insert({
    meal_id: mealId,
    user_id: user.id,
    food_id: f.id,
    food_name: f.brand ? `${f.name} (${f.brand})` : f.name,
    grams: v.grams,
    serving_qty: v.serving_qty,
    serving_label: v.serving_qty ? f.serving_label : null,
    ...n,
  });
  if (error) return { error: error.message };
  revalidatePath("/diary");
  revalidatePath("/dashboard");
  redirect(`/diary?date=${v.eaten_on}`);
}

export async function deleteMealItem(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("meal_items").delete().eq("id", String(fd.get("id"))).eq("user_id", user.id);
  revalidatePath("/diary");
  revalidatePath("/dashboard");
}

export async function toggleFavorite(fd: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(fd.get("meal_id"));
  const fav = fd.get("favorite") === "1";
  const name = String(fd.get("favorite_name") ?? "").trim().slice(0, 60) || null;
  await supabase.from("meals").update({ is_favorite: fav, favorite_name: fav ? name : null }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/diary");
}

/** Copia itens de uma refeição favorita para (dia, tipo). */
export async function applyFavorite(fd: FormData) {
  const { supabase, user } = await requireUser();
  const day = String(fd.get("date"));
  const type = String(fd.get("meal_type")) as MealType;
  const favId = String(fd.get("favorite_id"));
  if (!isIsoDate(day) || !MEAL_TYPES.includes(type) || !favId) return;
  const { data: items } = await supabase.from("meal_items").select(ITEM_COLS).eq("meal_id", favId).eq("user_id", user.id);
  if (!items?.length) return;
  const mealId = await ensureMeal(supabase, user.id, day, type);
  await supabase.from("meal_items").insert(snapshot(items as MealItem[], mealId, user.id));
  revalidatePath("/diary");
  revalidatePath("/dashboard");
}

/** Repete todas as refeições do dia anterior no dia informado. */
export async function copyPreviousDay(fd: FormData) {
  const { supabase, user } = await requireUser();
  const day = String(fd.get("date"));
  if (!isIsoDate(day)) return;
  const { data: meals } = await supabase
    .from("meals")
    .select(`meal_type, meal_items(${ITEM_COLS})`)
    .eq("user_id", user.id)
    .eq("eaten_on", addDays(day, -1));
  for (const m of meals ?? []) {
    const items = (m.meal_items ?? []) as MealItem[];
    if (!items.length) continue;
    const mealId = await ensureMeal(supabase, user.id, day, m.meal_type as MealType);
    await supabase.from("meal_items").insert(snapshot(items, mealId, user.id));
  }
  revalidatePath("/diary");
  revalidatePath("/dashboard");
}

export async function addWater(fd: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = waterSchema.safeParse(formToObject(fd));
  if (!parsed.success) return;
  await supabase.from("water_logs").insert({ user_id: user.id, ...parsed.data });
  revalidatePath("/diary");
  revalidatePath("/dashboard");
}

export async function undoWater(fd: FormData) {
  const { supabase, user } = await requireUser();
  const day = String(fd.get("date"));
  const { data } = await supabase
    .from("water_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("logged_on", day)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) await supabase.from("water_logs").delete().eq("id", data.id);
  revalidatePath("/diary");
  revalidatePath("/dashboard");
}
