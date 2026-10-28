import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import type { Exercise } from "@/lib/types";
import { ActivityForm } from "./activity-form";

export const metadata = { title: "Registrar atividade" };

export default async function ActivityPage() {
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, type, met_light, met_moderate, met_vigorous")
    .in("type", ["cardio", "esporte", "mobilidade", "musculacao"])
    .or("source.eq.compendium,created_by.not.is.null")
    .order("type")
    .order("name");
  return (
    <>
      <PageHeader title="Cardio / esporte" back="/workouts" />
      <ActivityForm activities={(data ?? []) as Exercise[]} today={localDate()} weightKg={Number(profile.weight_kg)} />
    </>
  );
}
