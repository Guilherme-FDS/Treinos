import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { ActionForm, SubmitButton } from "@/components/form";
import { ProfileForm } from "@/components/profile-form";
import { Badge, Button, Card, Field, fmt, Input, PageHeader } from "@/components/ui";
import { deleteWeightLog, logWeight, respondCoachInvite } from "@/lib/actions/profile";
import { requireProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { getTargets } from "@/lib/targets";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { supabase, profile } = await requireProfile();
  const today = localDate();
  const [{ data: weights }, { data: invites }, targets] = await Promise.all([
    supabase.from("weight_logs").select("id, logged_on, weight_kg, body_fat_pct").eq("user_id", profile.id).order("logged_on", { ascending: false }).limit(10),
    supabase.from("coach_students").select("coach_id, status, coach:profiles!coach_students_coach_id_fkey(full_name, email)").eq("student_id", profile.id),
    getTargets(supabase, profile, today),
  ]);

  return (
    <>
      <PageHeader
        title="Perfil"
        action={<Badge tone="accent">{profile.role}</Badge>}
      />
      <div className="flex flex-col gap-4">
        {targets && (
          <Card>
            <h2 className="mb-2 font-semibold">Metas atuais</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Basal ({targets.bmr_formula === "katch" ? "Katch-McArdle" : "Mifflin-St Jeor"})</dt>
              <dd className="text-right">{fmt(targets.bmr_kcal)} kcal</dd>
              <dt className="text-muted">Manutenção (×{targets.activity_factor} + TEF)</dt>
              <dd className="text-right">{fmt(targets.maintenance_kcal)} kcal</dd>
              <dt className="text-muted">Meta ({targets.adjust_pct > 0 ? "+" : ""}{targets.adjust_pct}%)</dt>
              <dd className="text-right font-semibold">{fmt(targets.target_kcal)} kcal</dd>
              <dt className="text-muted">P / C / G</dt>
              <dd className="text-right">{fmt(targets.protein_g)} / {fmt(targets.carbs_g)} / {fmt(targets.fat_g)} g</dd>
              <dt className="text-muted">Água base</dt>
              <dd className="text-right">{fmt(targets.water_ml)} ml</dd>
            </dl>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-semibold">Registrar peso</h2>
          <ActionForm action={logWeight} className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input name="logged_on" type="date" defaultValue={today} max={today} required />
            </Field>
            <Field label="Peso (kg)">
              <Input name="weight_kg" type="number" step="0.1" inputMode="decimal" defaultValue={profile.weight_kg ?? ""} required />
            </Field>
            <Field label="% gordura">
              <Input name="body_fat_pct" type="number" step="0.1" inputMode="decimal" />
            </Field>
            <div className="flex items-end">
              <SubmitButton className="w-full">Registrar</SubmitButton>
            </div>
          </ActionForm>
          {!!weights?.length && (
            <ul className="mt-4 divide-y divide-border text-sm">
              {weights.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2">
                  <span>{new Date(`${w.logged_on}T12:00:00Z`).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-3">
                    {fmt(w.weight_kg, 1)} kg{w.body_fat_pct != null && ` · ${fmt(w.body_fat_pct, 1)}%`}
                    <form action={deleteWeightLog}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="text-muted hover:text-danger" aria-label="Excluir">×</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!!invites?.length && (
          <Card>
            <h2 className="mb-2 font-semibold">Personal</h2>
            {invites.map((i) => {
              const coach = (Array.isArray(i.coach) ? i.coach[0] : i.coach) as { full_name: string | null; email: string | null } | null;
              return (
                <div key={i.coach_id} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span>{coach?.full_name ?? coach?.email ?? "Personal"} {i.status === "pending" && <Badge tone="warn">convite</Badge>}</span>
                  <form action={respondCoachInvite} className="flex gap-2">
                    <input type="hidden" name="coach_id" value={i.coach_id} />
                    {i.status === "pending" && <Button size="sm" name="accept" value="1">Aceitar</Button>}
                    <Button size="sm" variant="secondary" name="accept" value="0">{i.status === "pending" ? "Recusar" : "Remover"}</Button>
                  </form>
                </div>
              );
            })}
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-semibold">Dados e objetivo</h2>
          <ProfileForm profile={profile} />
        </Card>

        <div className="flex gap-3">
          {(profile.role === "personal" || profile.role === "admin") && (
            <Link href="/coach" className="flex-1 rounded-xl border border-border bg-card p-3 text-center text-sm">Meus alunos</Link>
          )}
          <Link href="/exercises" className="flex-1 rounded-xl border border-border bg-card p-3 text-center text-sm">Exercícios</Link>
        </div>
        <form action={signOut}>
          <Button variant="secondary" className="w-full">Sair</Button>
        </form>
      </div>
    </>
  );
}
