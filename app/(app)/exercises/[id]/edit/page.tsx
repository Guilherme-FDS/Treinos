import { notFound } from "next/navigation";
import { ExerciseForm } from "@/components/exercise-form";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import type { Exercise } from "@/lib/types";

export default async function EditExercisePage({ params }: PageProps<"/exercises/[id]/edit">) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  const { data } = await supabase.from("exercises").select("*").eq("id", id).eq("created_by", user.id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title="Editar exercício" back={`/exercises/${id}`} />
      <ExerciseForm exercise={data as Exercise} userId={user.id} />
    </>
  );
}
