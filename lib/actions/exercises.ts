"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { exerciseSchema, firstError, formToObject } from "@/lib/schemas";

export async function saveExercise(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = exerciseSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const id = fd.get("$id");
  const q = id
    ? supabase.from("exercises").update(parsed.data).eq("id", String(id)).eq("created_by", user.id)
    : supabase.from("exercises").insert({ ...parsed.data, source: "user", created_by: user.id });
  const { data, error } = await q.select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/exercises");
  redirect(`/exercises/${data.id}`);
}

export async function deleteExercise(fd: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("exercises").delete().eq("id", String(fd.get("id"))).eq("created_by", user.id);
  if (error) redirect(`/exercises/${fd.get("id")}?error=em-uso`);
  revalidatePath("/exercises");
  redirect("/exercises");
}
