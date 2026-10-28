import Link from "next/link";
import { DateNav } from "@/components/date-nav";
import { WaterCard } from "@/components/water-card";
import { Button, Card, fmt, PageHeader, Progress } from "@/components/ui";
import { applyFavorite, copyPreviousDay, deleteMealItem, toggleFavorite } from "@/lib/actions/diary";
import { requireProfile } from "@/lib/auth";
import { summarizeDay, sumNutrients } from "@/lib/calc";
import { isIsoDate, localDate } from "@/lib/dates";
import { loadDay } from "@/lib/day";
import { getTargets } from "@/lib/targets";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/types";

export const metadata = { title: "Diário" };

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const today = localDate();
  const sp = await searchParams;
  const day = isIsoDate(sp.date) && sp.date <= today ? sp.date : today;

  const [d, targets, { data: favorites }] = await Promise.all([
    loadDay(supabase, profile.id, day),
    getTargets(supabase, profile, day),
    supabase.from("meals").select("id, meal_type, favorite_name, eaten_on").eq("user_id", profile.id).eq("is_favorite", true).order("created_at", { ascending: false }).limit(20),
  ]);
  const summary = targets
    ? summarizeDay({ base: targets, trainingKcal: d.trainingKcal, trainingHours: d.trainingHours, consumed: { ...d.totals, water_ml: d.waterMl } })
    : null;
  const byType = new Map(d.meals.map((m) => [m.meal_type, m]));
  const empty = d.meals.every((m) => m.meal_items.length === 0);

  return (
    <>
      <PageHeader title="Diário" />
      <DateNav day={day} today={today} base="/diary" />
      {summary && (
        <Card className="mb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">{fmt(d.totals.kcal)}</span>
            <span className="text-sm text-muted">de {fmt(summary.target.kcal)} kcal</span>
          </div>
          <Progress value={d.totals.kcal} max={summary.target.kcal} />
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            {([
              ["Proteína", d.totals.protein, summary.target.protein_g, "var(--protein)"],
              ["Carbo", d.totals.carbs, summary.target.carbs_g, "var(--carbs)"],
              ["Gordura", d.totals.fat, summary.target.fat_g, "var(--fat)"],
            ] as const).map(([l, v, t, c]) => (
              <div key={l}>
                <div className="mb-1 flex justify-between"><span>{l}</span><span className="text-muted">{fmt(v)}/{fmt(t)}g</span></div>
                <Progress value={v} max={t} color={c} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {MEAL_TYPES.map((type) => {
          const meal = byType.get(type);
          const items = meal?.meal_items ?? [];
          const t = sumNutrients(items);
          const favs = (favorites ?? []).filter((f) => f.id !== meal?.id);
          return (
            <Card key={type}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{MEAL_LABELS[type]}</h2>
                <span className="text-sm text-muted">{fmt(t.kcal)} kcal</span>
              </div>
              {items.length > 0 && (
                <ul className="mt-2 divide-y divide-border text-sm">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate">{i.food_name}</p>
                        <p className="text-xs text-muted">
                          {i.serving_qty ? `${fmt(i.serving_qty, 2)} × ${i.serving_label ?? "porção"} · ` : ""}
                          {fmt(i.grams)} g · P {fmt(i.protein, 1)} C {fmt(i.carbs, 1)} G {fmt(i.fat, 1)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span>{fmt(i.kcal)}</span>
                        <form action={deleteMealItem}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="px-1 text-muted hover:text-danger" aria-label="Remover">×</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={`/diary/add?date=${day}&meal=${type}`} className="rounded-xl bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent">
                  + Adicionar
                </Link>
                {meal && items.length > 0 && (
                  <form action={toggleFavorite} className="flex items-center gap-1">
                    <input type="hidden" name="meal_id" value={meal.id} />
                    <input type="hidden" name="favorite" value={meal.is_favorite ? "0" : "1"} />
                    <input type="hidden" name="favorite_name" value={`${MEAL_LABELS[type]} ${new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR")}`} />
                    <button className="rounded-xl px-2 py-1.5 text-sm text-muted hover:bg-bg" aria-label="Favoritar">
                      {meal.is_favorite ? "★ Favorita" : "☆ Favoritar"}
                    </button>
                  </form>
                )}
                {favs.length > 0 && (
                  <form action={applyFavorite} className="flex items-center gap-1">
                    <input type="hidden" name="date" value={day} />
                    <input type="hidden" name="meal_type" value={type} />
                    <select name="favorite_id" className="h-8 max-w-40 rounded-lg border border-border bg-card px-2 text-xs" defaultValue="">
                      <option value="" disabled>Favoritas…</option>
                      {favs.map((f) => (
                        <option key={f.id} value={f.id}>{f.favorite_name ?? MEAL_LABELS[f.meal_type as keyof typeof MEAL_LABELS]}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="ghost">Usar</Button>
                  </form>
                )}
              </div>
            </Card>
          );
        })}

        {empty && (
          <form action={copyPreviousDay}>
            <input type="hidden" name="date" value={day} />
            <Button variant="secondary" className="w-full">Repetir refeições do dia anterior</Button>
          </form>
        )}

        {summary && <WaterCard day={day} ml={d.waterMl} target={summary.target.water_ml} />}
      </div>
    </>
  );
}
