import Link from "next/link";
import { Badge, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { EXERCISE_TYPE_LABELS, type Exercise } from "@/lib/types";

export const metadata = { title: "Exercícios" };

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { supabase, user } = await requireProfile();
  const { q = "", type = "" } = await searchParams;
  let query = supabase.from("exercises").select("id, name, muscle_group, equipment, type, image_url, created_by").order("name").limit(80);
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
  if (type in EXERCISE_TYPE_LABELS) query = query.eq("type", type);
  const { data } = await query;
  const list = (data ?? []) as Exercise[];

  return (
    <>
      <PageHeader title="Exercícios" back="/workouts" action={<LinkButton href="/exercises/new" size="sm">Novo</LinkButton>} />
      <form className="mb-4 flex gap-2">
        <Input name="q" type="search" defaultValue={q} placeholder="Buscar exercício" />
        <Select name="type" defaultValue={type} className="w-36">
          <option value="">Todos</option>
          {Object.entries(EXERCISE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </form>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {list.map((e) => (
          <li key={e.id}>
            <Link href={`/exercises/${e.id}`} className="flex items-center gap-3 p-3 hover:bg-bg">
              {e.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.image_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain" loading="lazy" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-border/60" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.name}</p>
                <p className="truncate text-xs text-muted">{[e.muscle_group, e.equipment].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="flex gap-1">
                {e.created_by === user.id && <Badge tone="accent">meu</Badge>}
                <Badge>{EXERCISE_TYPE_LABELS[e.type]}</Badge>
              </span>
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhum exercício encontrado.</li>}
      </ul>
    </>
  );
}
