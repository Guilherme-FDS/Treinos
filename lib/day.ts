import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sumNutrients } from "@/lib/calc";
import type { Meal, Workout } from "@/lib/types";

/** Dados do dia: refeições+itens, água e treinos. */
export async function loadDay(supabase: SupabaseClient, userId: string, day: string) {
  const [meals, water, workouts] = await Promise.all([
    supabase
      .from("meals")
      .select("id, eaten_on, meal_type, is_favorite, favorite_name, meal_items(*)")
      .eq("user_id", userId)
      .eq("eaten_on", day)
      .order("created_at", { referencedTable: "meal_items" }),
    supabase.from("water_logs").select("ml").eq("user_id", userId).eq("logged_on", day),
    supabase.from("workouts").select("*").eq("user_id", userId).eq("performed_on", day).order("created_at"),
  ]);
  const mealList = (meals.data ?? []) as Meal[];
  const totals = sumNutrients(mealList.flatMap((m) => m.meal_items));
  const waterMl = (water.data ?? []).reduce((a, w) => a + Number(w.ml), 0);
  const workoutList = ((workouts.data ?? []) as Workout[]).map((w) => ({ ...w, kcal: Number(w.kcal), duration_min: Number(w.duration_min) }));
  const trainingKcal = workoutList.reduce((a, w) => a + w.kcal, 0);
  const trainingHours = workoutList.reduce((a, w) => a + w.duration_min, 0) / 60;
  return { meals: mealList, totals, waterMl, workouts: workoutList, trainingKcal, trainingHours };
}
