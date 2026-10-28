import { notFound } from "next/navigation";
import { ExerciseHistoryChart } from "@/components/charts";
import { VideoPlayer } from "@/components/video-player";
import { Badge, Button, Card, fmt, LinkButton, PageHeader } from "@/components/ui";
import { deleteExercise } from "@/lib/actions/exercises";
import { requireProfile } from "@/lib/auth";
import { personalRecords, sessionStats, type HistorySet } from "@/lib/calc";
import { EXERCISE_TYPE_LABELS, type Exercise } from "@/lib/types";

export default async function ExercisePage({ params, searchParams }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const sp = (await searchParams) as { error?: string };
  const { supabase, user } = await requireProfile();
  const { data } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as Exercise;

  const { data: rows } = await supabase
    .from("workout_sets")
    .select("workout_id, reps, load_kg, workouts!inner(performed_on)")
    .eq("user_id", user.id)
    .eq("exercise_id", id)
    .eq("done", true)
    .order("done_at", { ascending: true })
    .limit(1000);
  const sets: HistorySet[] = (rows ?? []).map((r) => {
    const w = (Array.isArray(r.workouts) ? r.workouts[0] : r.workouts) as { performed_on: string };
    return { workout_id: r.workout_id, performed_on: w.performed_on, reps: Number(r.reps ?? 0), load_kg: Number(r.load_kg ?? 0) };
  });
  const sessions = sessionStats(sets);
  const pr = personalRecords(sets);
  const chart = sessions.slice(-20).map((s) => ({
    label: new Date(`${s.performed_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    load: s.maxLoad,
    volume: s.volume,
    e1rm: Math.round(s.bestE1rm),
  }));
  const mets = [e.met_light, e.met_moderate, e.met_vigorous];

  return (
    <>
      <PageHeader title={e.name} back="/exercises" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          <Badge>{EXERCISE_TYPE_LABELS[e.type]}</Badge>
          {e.muscle_group && <span>{e.muscle_group}</span>}
          {e.equipment && <span>· {e.equipment}</span>}
        </div>
        {sp.error === "em-uso" && <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger">Exercício em uso em fichas ou treinos; não pode ser excluído.</p>}
        {e.video_url && <VideoPlayer url={e.video_url} title={e.name} />}
        {!e.video_url && e.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.image_url} alt={e.name} className="mx-auto max-h-64 rounded-2xl bg-white object-contain p-2" />
        )}
        {e.instructions && (
          <Card>
            <h2 className="mb-2 font-semibold">Execução</h2>
            <p className="whitespace-pre-line text-sm">{e.instructions}</p>
          </Card>
        )}
        {mets.some((m) => m != null) && (
          <Card className="grid grid-cols-3 text-center text-sm">
            {(["Leve", "Moderado", "Vigoroso"] as const).map((l, i) => (
              <div key={l}><p className="text-lg font-semibold">{fmt(mets[i], 1)}</p><p className="text-xs text-muted">MET {l.toLowerCase()}</p></div>
            ))}
          </Card>
        )}
        {e.type === "musculacao" && (
          <Card>
            <h2 className="mb-2 font-semibold">Histórico</h2>
            {sessions.length ? (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-lg font-semibold">{fmt(pr.maxLoad?.value, 1)} kg</p><p className="text-xs text-muted">carga máx. ({pr.maxLoad?.reps} reps)</p></div>
                  <div><p className="text-lg font-semibold">{fmt(pr.bestE1rm?.value, 1)} kg</p><p className="text-xs text-muted">1RM estimado</p></div>
                  <div><p className="text-lg font-semibold">{fmt(pr.maxVolume?.value)} kg</p><p className="text-xs text-muted">volume recorde</p></div>
                </div>
                <ExerciseHistoryChart data={chart} />
              </>
            ) : (
              <p className="text-sm text-muted">Sem séries registradas ainda.</p>
            )}
          </Card>
        )}
        {(e.attribution || e.source_url) && (
          <p className="text-xs text-muted">
            Fonte: {e.attribution ?? e.source}
            {e.license?.startsWith("CC") && <> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">{e.license}</a></>}
            {e.source_url && <> · <a className="underline" href={e.source_url} target="_blank" rel="noreferrer">original</a></>}
          </p>
        )}
        {e.created_by === user.id && (
          <div className="flex gap-2">
            <LinkButton href={`/exercises/${e.id}/edit`} variant="secondary" className="flex-1">Editar</LinkButton>
            <form action={deleteExercise} className="flex-1">
              <input type="hidden" name="id" value={e.id} />
              <Button variant="danger" className="w-full">Excluir</Button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
