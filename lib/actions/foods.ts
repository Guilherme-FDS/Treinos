"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { firstError, foodSchema, formToObject } from "@/lib/schemas";

export async function saveFood(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = foodSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const id = fd.get("$id");

  const q = id
    ? supabase.from("foods").update(parsed.data).eq("id", String(id)).eq("created_by", user.id)
    : supabase.from("foods").insert({ ...parsed.data, source: "manual", verified: false, created_by: user.id });
  const { data, error } = await q.select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "Já existe um alimento com esse código de barras." };
    return { error: error.message };
  }
  revalidatePath("/foods");
  const back = fd.get("$back");
  redirect(typeof back === "string" && back.startsWith("/") ? back : `/foods/${data.id}`);
}

export async function deleteFood(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("foods").delete().eq("id", String(fd.get("id"))).eq("created_by", user.id);
  revalidatePath("/foods");
  redirect("/foods");
}
