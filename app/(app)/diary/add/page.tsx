import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { isIsoDate, localDate } from "@/lib/dates";
import { MEAL_TYPES, type Food, type MealType } from "@/lib/types";
import { AddFood } from "./add-food";

export const metadata = { title: "Adicionar alimento" };

function guessMeal(): MealType {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (h < 10) return "cafe";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  if (h < 22) return "jantar";
  return "ceia";
}

export default async function AddPage({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string; food?: string }> }) {
  const { supabase } = await requireProfile();
  const sp = await searchParams;
  const today = localDate();
  const day = isIsoDate(sp.date) && sp.date <= today ? sp.date : today;
  const meal = MEAL_TYPES.includes(sp.meal as MealType) ? (sp.meal as MealType) : guessMeal();
  let food: Food | null = null;
  if (sp.food) {
    const { data } = await supabase.from("foods").select("*").eq("id", sp.food).maybeSingle();
    food = data as Food | null;
  }
  return (
    <>
      <PageHeader title="Adicionar" back={`/diary?date=${day}`} />
      <AddFood day={day} meal={meal} initialFood={food} />
    </>
  );
}
