"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { VideoPlayer } from "@/components/video-player";
import { Button, Card, PageHeader } from "@/components/ui";
import { finishWorkout } from "@/lib/actions/workouts";
import { METHOD_LABELS, type TrainingMethod } from "@/lib/types";

export type RunSet = { reps: number; load: number; prevLabel: string | null; done: boolean; doneAt?: number };
export type RunExercise = {
  itemId: string;
  exerciseId: string;
  name: string;
  videoUrl: string | null;
  imageUrl: string | null;
  instructions: string | null;
  restS: number;
  method: TrainingMethod;
  notes: string | null;
  repsLabel: string;
  sets: RunSet[];
};

type State = { startedAt: number; exercises: RunExercise[] };

function useRestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt) {
        navigator.vibrate?.([200, 100, 200]);
        setEndsAt(null);
      }
    }, 250);
    return () => clearInterval(t);
  }, [endsAt]);
  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  return {
    left,
    running: !!endsAt,
    start: (s: number) => { setNow(Date.now()); setEndsAt(Date.now() + s * 1000); },
    add: (s: number) => setEndsAt((e) => (e ? e + s * 1000 : e)),
    stop: () => setEndsAt(null),
  };
}

export function Runner({ templateId, name, day, exercises }: { templateId: string; name: string; day: string; exercises: RunExercise[] }) {
  const key = `run:${templateId}`;
  const router = useRouter();
  // Restaura treino em andamento (reload/aba fechada). Componente é client-only (ssr: false).
  const [state, setState] = useState<State>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const s = JSON.parse(saved) as State;
        if (Date.now() - s.startedAt < 6 * 3600_000 && s.exercises.length === exercises.length) return s;
      }
    } catch {}
    return { startedAt: Date.now(), exercises };
  });
  const [open, setOpen] = useState<number>(0);
  const [video, setVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const timer = useRestTimer();

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - state.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state.startedAt]);

  function patchSet(ei: number, si: number, patch: Partial<RunSet>) {
    setState((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) })),
    }));
  }
  function toggleDone(ei: number, si: number) {
    const set = state.exercises[ei].sets[si];
    const done = !set.done;
    patchSet(ei, si, { done, doneAt: done ? Date.now() : undefined });
    if (done) timer.start(state.exercises[ei].restS);
  }
  function addSet(ei: number) {
    setState((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => {
        if (i !== ei) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { reps: lastSet?.reps ?? 10, load: lastSet?.load ?? 0, prevLabel: null, done: false }] };
      }),
    }));
  }

  const doneSets = state.exercises.flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ e, s })));

  function finish() {
    setError(null);
    const sets = state.exercises.flatMap((e) =>
      e.sets
        .map((s, idx) => ({ s, idx }))
        .filter(({ s }) => s.done)
        .map(({ s, idx }) => ({ exercise_id: e.exerciseId, set_index: idx, reps: Math.round(s.reps), load_kg: s.load, rest_s: e.restS })),
    );
    if (!sets.length) return setError("Marque ao menos uma série como feita.");
    start(async () => {
      const r = await finishWorkout({
        template_id: templateId,
        name,
        performed_on: day,
        started_at: new Date(state.startedAt).toISOString(),
        ended_at: new Date().toISOString(),
        sets,
      });
      if (r.error) return setError(r.error);
      try { localStorage.removeItem(key); } catch {}
      router.push("/workouts");
      router.refresh();
    });
  }

  function discard() {
    if (!confirm("Descartar treino em andamento?")) return;
    try { localStorage.removeItem(key); } catch {}
    router.push("/workouts");
  }

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      <PageHeader title={name} back="/workouts" action={<span className="font-mono text-sm text-muted">{mm(elapsed)}</span>} />
      <div className="flex flex-col gap-3">
        {state.exercises.map((e, ei) => {
          const doneCount = e.sets.filter((s) => s.done).length;
          const isOpen = open === ei;
          return (
            <Card key={e.itemId} className={doneCount === e.sets.length ? "opacity-70" : ""}>
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen(isOpen ? -1 : ei)}>
                <div>
                  <p className="font-semibold">{ei + 1}. {e.name}</p>
                  <p className="text-xs text-muted">
                    {e.sets.length}×{e.repsLabel} · {e.restS}s{e.method !== "normal" && ` · ${METHOD_LABELS[e.method]}`}
                  </p>
                </div>
                <span className="text-sm text-muted">{doneCount}/{e.sets.length}</span>
              </button>
              {isOpen && (
                <div className="mt-3 flex flex-col gap-2">
                  {e.notes && <p className="rounded-lg bg-bg p-2 text-xs">{e.notes}</p>}
                  {(e.videoUrl || e.instructions || e.imageUrl) && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setVideo(video === e.itemId ? null : e.itemId)}>
                      {video === e.itemId ? "Ocultar execução" : "Ver execução"}
                    </Button>
                  )}
                  {video === e.itemId && (
                    <div className="flex flex-col gap-2">
                      {e.videoUrl ? (
                        <VideoPlayer url={e.videoUrl} title={e.name} />
                      ) : e.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imageUrl} alt={e.name} className="mx-auto max-h-48 rounded-xl bg-white object-contain p-1" />
                      ) : null}
                      {e.instructions && <p className="whitespace-pre-line text-xs text-muted">{e.instructions}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 text-xs text-muted">
                    <span>#</span><span>kg</span><span>reps</span><span />
                  </div>
                  {e.sets.map((s, si) => (
                    <div key={si} className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2">
                      <span className="text-sm text-muted">{si + 1}</span>
                      <input
                        type="number" inputMode="decimal" step="0.5" min={0} value={s.load}
                        onChange={(ev) => patchSet(ei, si, { load: Number(ev.target.value) })}
                        className="h-10 rounded-lg border border-border bg-card px-2"
                        aria-label="Carga (kg)"
                      />
                      <input
                        type="number" inputMode="numeric" min={0} value={s.reps}
                        onChange={(ev) => patchSet(ei, si, { reps: Number(ev.target.value) })}
                        className="h-10 rounded-lg border border-border bg-card px-2"
                        aria-label="Repetições"
                      />
                      <button
                        type="button"
                        onClick={() => toggleDone(ei, si)}
                        className={`h-10 rounded-lg text-lg ${s.done ? "bg-accent text-accent-fg" : "border border-border"}`}
                        aria-label={s.done ? "Desmarcar série" : "Marcar série feita"}
                      >
                        ✓
                      </button>
                      {s.prevLabel && <span className="col-span-4 -mt-1 pl-10 text-[11px] text-muted">anterior: {s.prevLabel}</span>}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="ghost" onClick={() => addSet(ei)}>+ série</Button>
                </div>
              )}
            </Card>
          );
        })}
        {error && <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger">{error}</p>}
        <Button onClick={finish} disabled={saving}>{saving ? "Salvando…" : `Finalizar treino (${doneSets.length} séries)`}</Button>
        <Button variant="ghost" onClick={discard}>Descartar</Button>
      </div>

      {timer.running && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-fg px-4 py-3 text-bg shadow-xl">
          <span className="text-sm">Descanso</span>
          <span className="font-mono text-2xl font-semibold">{mm(timer.left)}</span>
          <div className="flex gap-1">
            <button className="rounded-lg px-2 py-1 text-sm opacity-80" onClick={() => timer.add(15)}>+15s</button>
            <button className="rounded-lg px-2 py-1 text-sm opacity-80" onClick={timer.stop}>Pular</button>
          </div>
        </div>
      )}
    </>
  );
}
