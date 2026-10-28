"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { firstError, formToObject, profileSchema, weightLogSchema } from "@/lib/schemas";
import { recomputeTargets } from "@/lib/targets";
import type { Profile } from "@/lib/types";

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const pace = v.goal === "emagrecer" ? v.pace_pct : v.goal === "ganhar" ? 10 : 0;

  const { data: before } = await supabase.from("profiles").select("weight_kg, onboarded_at").eq("id", user.id).single();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ ...v, pace_pct: pace, onboarded_at: before?.onboarded_at ?? new Date().toISOString() })
    .eq("id", user.id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  const today = localDate();
  if (!before?.onboarded_at || Number(before.weight_kg) !== v.weight_kg) {
    await supabase
      .from("weight_logs")
      .upsert(
        { user_id: user.id, logged_on: today, weight_kg: v.weight_kg, body_fat_pct: v.body_fat_pct },
        { onConflict: "user_id,logged_on" },
      );
  }
  await recomputeTargets(supabase, profile as Profile, today);
  revalidatePath("/", "layout");

  if (fd.get("$redirect") === "dashboard") redirect("/dashboard");
  return { ok: "Perfil salvo. Metas recalculadas." };
}

/** Novo peso → atualiza perfil (se for o registro mais recente) e recalcula metas desde a data. */
export async function logWeight(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = weightLogSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const { error } = await supabase
    .from("weight_logs")
    .upsert({ user_id: user.id, ...v }, { onConflict: "user_id,logged_on" });
  if (error) return { error: error.message };

  const { data: latest } = await supabase
    .from("weight_logs")
    .select("logged_on")
    .eq("user_id", user.id)
    .order("logged_on", { ascending: false })
    .limit(1)
    .single();

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (latest?.logged_on === v.logged_on) {
    const patch: Record<string, number> = { weight_kg: v.weight_kg };
    if (v.body_fat_pct != null) patch.body_fat_pct = v.body_fat_pct;
    ({ data: profile } = await supabase.from("profiles").update(patch).eq("id", user.id).select("*").single());
  }
  if (profile) await recomputeTargets(supabase, { ...(profile as Profile), weight_kg: v.weight_kg }, v.logged_on);

  revalidatePath("/", "layout");
  return { ok: "Peso registrado. Metas recalculadas." };
}

export async function deleteWeightLog(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("weight_logs").delete().eq("id", String(fd.get("id"))).eq("user_id", user.id);
  revalidatePath("/profile");
}

export async function inviteStudent(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const email = String(fd.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail do aluno." };
  const { error } = await supabase.rpc("invite_student", { student_email: email });
  if (error) return { error: error.message };
  revalidatePath("/coach");
  return { ok: "Convite enviado. O aluno precisa aceitar no perfil." };
}

export async function respondCoachInvite(fd: FormData) {
  const { supabase, user } = await requireUser();
  const coachId = String(fd.get("coach_id"));
  if (fd.get("accept") === "1") {
    await supabase.from("coach_students").update({ status: "active" }).eq("coach_id", coachId).eq("student_id", user.id);
  } else {
    await supabase.from("coach_students").delete().eq("coach_id", coachId).eq("student_id", user.id);
  }
  revalidatePath("/profile");
}

export async function removeStudent(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("coach_students").delete().eq("coach_id", user.id).eq("student_id", String(fd.get("student_id")));
  revalidatePath("/coach");
}
