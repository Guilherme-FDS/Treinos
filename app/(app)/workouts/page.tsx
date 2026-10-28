import Link from "next/link";
import { Badge, Button, Card, Empty, fmt, LinkButton, PageHeader } from "@/components/ui";
import { deleteWorkout, duplicateTemplate } from "@/lib/actions/workouts";
import { requireProfile } from "@/lib/auth";
import { INTENSITY_LABELS, type Intensity } from "@/lib/calc";
import { WEEKDAY_LABELS } from "@/lib/types";

export const metadata = { title: "Treinos" };

export default async function WorkoutsPage() {
  const { supabase, profile } = await requireProfile();
  const [{ data: templates }, { data: recent }] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name, goal, weekdays, owner_id, assigned_to, workout_template_items(count)")
      .or(`owner_id.eq.${profile.id},assigned_to.eq.${profile.id}`)
      .eq("archived", false)
      .order("name"),
    supabase.from("workouts").select("id, name, performed_on, duration_min, kcal, intensity, type").eq("user_id", profile.id).order("performed_on", { ascending: false }).order("created_at", { ascending: false }).limit(15),
  ]);
  const mine = (templates ?? []).filter((t) => t.owner_id === profile.id && (!t.assigned_to || t.assigned_to === profile.id));
  const fromCoach = (templates ?? []).filter((t) => t.owner_id !== profile.id);

  const TemplateCard = ({ t, own }: { t: NonNullable<typeof templates>[number]; own: boolean }) => {
    const count = (t.workout_template_items as unknown as { count: number }[])?.[0]?.count ?? 0;
    return (
      <Card className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/workouts/templates/${t.id}`} className="min-w-0">
            <p className="font-semibold">{t.name}</p>
            <p className="text-xs text-muted">
              {count} exercícios
              {(t.weekdays as number[]).length > 0 && ` · ${(t.weekdays as number[]).map((d) => WEEKDAY_LABELS[d]).join(", ")}`}
              {t.goal && ` · ${t.goal}`}
            </p>
          </Link>
          {!own && <Badge tone="accent">personal</Badge>}
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/workouts/run/${t.id}`} size="sm" className="flex-1">▶ Iniciar</LinkButton>
          <form action={duplicateTemplate}>
            <input type="hidden" name="id" value={t.id} />
            <Button size="sm" variant="secondary">Duplicar</Button>
          </form>
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Treinos" action={<LinkButton href="/workouts/templates/new" size="sm">Nova ficha</LinkButton>} />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <LinkButton href="/workouts/activity" variant="secondary" size="sm">+ Cardio/esporte</LinkButton>
          <LinkButton href="/exercises" variant="secondary" size="sm">Exercícios</LinkButton>
        </div>
        {fromCoach.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">Do seu personal</h2>
            {fromCoach.map((t) => <TemplateCard key={t.id} t={t} own={false} />)}
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted">Minhas fichas</h2>
          {mine.length ? mine.map((t) => <TemplateCard key={t.id} t={t} own />) : <Empty>Crie sua primeira ficha (Treino A, B, C…).</Empty>}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Histórico</h2>
          {recent?.length ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
              {recent.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(`${w.performed_on}T12:00:00Z`).toLocaleDateString("pt-BR")} · {fmt(w.duration_min)} min
                      {w.intensity && ` · ${INTENSITY_LABELS[w.intensity as Intensity]}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{fmt(w.kcal)} kcal</span>
                    <form action={deleteWorkout}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="px-1 text-muted hover:text-danger" aria-label="Excluir">×</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum treino registrado.</Empty>
          )}
        </section>
      </div>
    </>
  );
}
