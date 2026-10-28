import { TemplateForm } from "@/components/template-form";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { activeStudents } from "@/lib/coach";

export const metadata = { title: "Nova ficha" };

export default async function NewTemplatePage({ searchParams }: { searchParams: Promise<{ assign?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const { assign } = await searchParams;
  const students = profile.role !== "user" ? (await activeStudents(supabase, profile.id)).filter((s) => s.status === "active") : [];
  return (
    <>
      <PageHeader title="Nova ficha" back="/workouts" />
      <TemplateForm students={students} assignTo={assign} />
    </>
  );
}
