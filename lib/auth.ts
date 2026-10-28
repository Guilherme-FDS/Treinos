import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Exige login. */
export async function requireUser() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  return { supabase, user };
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const { supabase, user } = await getSession();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});

/** Exige login + onboarding completo. */
export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");
  return { supabase, user, profile };
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Evita open redirect: só caminhos internos. */
export function safeNext(next: unknown, fallback = "/dashboard") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
