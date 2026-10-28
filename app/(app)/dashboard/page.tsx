import Link from "next/link";
import { KcalWeekChart, WeightChart } from "@/components/charts";
import { WaterCard } from "@/components/water-card";
import { Card, fmt, LinkButton, Progress } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { dailyExpenditure, sumNutrients, summarizeDay } from "@/lib/calc";
import { addDays, localDate, weekdayOf } from "@/lib/dates";
import { loadDay } from "@/lib/day";
import { getTargets } from "@/lib/targets";
import { WEEKDAY_LABELS } from "@/lib/types";

export const metadata = { title: "Hoje" };

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  const today = localDate();
  const weekStart = addDays(today, -6);
  const monthStart = addDays(today, -29);

  const [d, targets, weekItems, weekWorkouts, weights, templates] = await Promise.all([
    loadDay(supabase, profile.id, today),
    getTargets(supabase, profile, today),
    supabase.from("meals").select("eaten_on, meal_items(kcal)").eq("user_id", profile.id).gte("eaten_on", weekStart).lte("eaten_on", today),
    supabase.from("workouts").select("performed_on, kcal").eq("user_id", profile.id).gte("performed_on", weekStart).lte("performed_on", today),
    supabase.from("weight_logs").select("logged_on, weight_kg").eq("user_id", profile.id).gte("logged_on", monthStart).order("logged_on"),
    supabase.from("workout_templates").select("id, name, weekdays").or(`owner_id.eq.${profile.id},assigned_to.eq.${profile.id}`).eq("archived", false),
  ]);

  if (!targets) {
    return (
      <Card>
        <p className="mb-3">Complete seu perfil para calcular as metas.</p>
        <LinkButton href="/profile">Completar perfil</LinkButton>
      </Card>
    );
  }

  const s = summarizeDay({
    base: targets,
    trainingKcal: d.trainingKcal,
    trainingHours: d.trainingHours,
    consumed: { kcal: d.totals.kcal, protein: d.totals.protein, carbs: d.totals.carbs, fat: d.totals.fat, water_ml: d.waterMl },
  });
  const remaining = s.target.kcal - d.totals.kcal;

  // Semana
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const kcalBy = new Map<string, number>();
  for (const m of weekItems.data ?? []) kcalBy.set(m.eaten_on, (kcalBy.get(m.eaten_on) ?? 0) + sumNutrients(m.meal_items ?? []).kcal);
  const trainBy = new Map<string, number>();
  for (const w of weekWorkouts.data ?? []) trainBy.set(w.performed_on, (trainBy.get(w.performed_on) ?? 0) + Number(w.kcal));
  const weekData = week.map((day) => {
    const kcal = kcalBy.get(day) ?? 0;
    const burned = dailyExpenditure({ bmr: targets.bmr_kcal, activityFactor: targets.activity_factor, trainingKcal: trainBy.get(day) ?? 0, intakeKcal: kcal }).total;
    return { label: WEEKDAY_LABELS[weekdayOf(day)], kcal: Math.round(kcal), burned: Math.round(burned) };
  });
  const weekBalance = weekData.reduce((a, w) => a + (w.kcal ? w.kcal - w.burned : 0), 0);
  const weightData = (weights.data ?? []).map((w) => ({
    label: new Date(`${w.logged_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weight: Number(w.weight_kg),
  }));
  const todaysTemplates = (templates.data ?? []).filter((t) => (t.weekdays as number[]).includes(weekdayOf(today)));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-muted">Olá{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</p>
        <h1 className="text-2xl font-semibold">Hoje</h1>
      </header>

      <Card>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">{remaining >= 0 ? "Restam" : "Acima da meta"}</p>
            <p className="text-3xl font-bold">{fmt(Math.abs(remaining))} <span className="text-base font-normal text-muted">kcal</span></p>
          </div>
          <p className="text-right text-sm text-muted">
            {fmt(d.totals.kcal)} / {fmt(s.target.kcal)}
            <br />consumido / meta
          </p>
        </div>
        <div className="mt-3"><Progress value={d.totals.kcal} max={s.target.kcal} /></div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          {([
            ["Proteína", d.totals.protein, s.target.protein_g, "var(--protein)"],
            ["Carbo", d.totals.carbs, s.target.carbs_g, "var(--carbs)"],
            ["Gordura", d.totals.fat, s.target.fat_g, "var(--fat)"],
          ] as const).map(([l, v, t, c]) => (
            <div key={l}>
              <div className="mb-1 flex justify-between"><span>{l}</span><span className="text-muted">{fmt(v)}/{fmt(t)}g</span></div>
              <Progress value={v} max={t} color={c} />
            </div>
          ))}
        </div>
        <LinkButton href="/diary/add" className="mt-4 w-full">+ Registrar alimento</LinkButton>
      </Card>

      <WaterCard day={today} ml={d.waterMl} target={s.target.water_ml} />

      <Card>
        <h2 className="mb-3 font-semibold">Gasto estimado</h2>
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
          <dt className="text-muted">Basal</dt><dd className="text-right">{fmt(s.expenditure.bmr)} kcal</dd>
          <dt className="text-muted">NEAT (ocupação ×{targets.activity_factor})</dt><dd className="text-right">{fmt(s.expenditure.neat)} kcal</dd>
          <dt className="text-muted">Treino</dt><dd className="text-right">{fmt(s.expenditure.training)} kcal</dd>
          <dt className="text-muted">TEF (10% ingerido)</dt><dd className="text-right">{fmt(s.expenditure.tef)} kcal</dd>
          <dt className="font-medium">Total (GET)</dt><dd className="text-right font-medium">{fmt(s.expenditure.total)} kcal</dd>
          <dt className="font-medium">Saldo</dt>
          <dd className={`text-right font-semibold ${s.balance < 0 ? "text-accent" : "text-warn"}`}>
            {s.balance > 0 ? "+" : ""}{fmt(s.balance)} kcal
          </dd>
        </dl>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Treino</h2>
          <Link href="/workouts" className="text-sm text-accent">Ver fichas</Link>
        </div>
        {d.workouts.length > 0 ? (
          <ul className="mb-2 text-sm">
            {d.workouts.map((w) => (
              <li key={w.id} className="flex justify-between py-1">
                <span>{w.name} · {fmt(w.duration_min)} min</span>
                <span className="text-muted">{fmt(w.kcal)} kcal</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-sm text-muted">Nenhum treino registrado hoje.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {todaysTemplates.map((t) => (
            <LinkButton key={t.id} href={`/workouts/run/${t.id}`} size="sm">▶ {t.name}</LinkButton>
          ))}
          <LinkButton href="/workouts/activity" size="sm" variant="secondary">+ Cardio/esporte</LinkButton>
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-semibold">Semana</h2>
          <span className={`text-sm ${weekBalance < 0 ? "text-accent" : "text-warn"}`}>
            saldo {weekBalance > 0 ? "+" : ""}{fmt(weekBalance)} kcal
          </span>
        </div>
        <KcalWeekChart data={weekData} target={targets.target_kcal} />
      </Card>

      <Card>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-semibold">Peso (30 dias)</h2>
          <Link href="/profile" className="text-sm text-accent">Registrar</Link>
        </div>
        <WeightChart data={weightData} />
      </Card>
    </div>
  );
}
