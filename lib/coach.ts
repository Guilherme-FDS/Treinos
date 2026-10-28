import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Alunos com vínculo ativo do personal. */
export async function activeStudents(supabase: SupabaseClient, coachId: string) {
  const { data } = await supabase
    .from("coach_students")
    .select("student_id, status, student:profiles!coach_students_student_id_fkey(full_name, email)")
    .eq("coach_id", coachId);
  return (data ?? []).map((r) => {
    const s = (Array.isArray(r.student) ? r.student[0] : r.student) as { full_name: string | null; email: string | null } | null;
    return { id: r.student_id as string, status: r.status as string, name: s?.full_name || s?.email || "Aluno", email: s?.email ?? null };
  });
}
