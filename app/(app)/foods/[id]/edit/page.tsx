import { notFound } from "next/navigation";
import { FoodForm } from "@/components/food-form";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import type { Food } from "@/lib/types";

export default async function EditFoodPage({ params }: PageProps<"/foods/[id]/edit">) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  const { data } = await supabase.from("foods").select("*").eq("id", id).eq("created_by", user.id).eq("verified", false).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title="Editar alimento" back={`/foods/${id}`} />
      <FoodForm food={data as Food} />
    </>
  );
}
