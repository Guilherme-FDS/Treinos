import { ExerciseForm } from "@/components/exercise-form";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Novo exercício" };

export default async function NewExercisePage() {
  const { user } = await requireProfile();
  return (
    <>
      <PageHeader title="Novo exercício" back="/exercises" />
      <ExerciseForm userId={user.id} />
    </>
  );
}
