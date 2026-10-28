"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ActionState } from "@/components/form";
import { safeNext, siteUrl } from "@/lib/auth";
import { credentialsSchema, firstError } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar.",
  "User already registered": "E-mail já cadastrado.",
};
const msg = (m: string) => AUTH_ERRORS[m] ?? m;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : siteUrl();
}

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: msg(error.message) };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
      data: { full_name: String(fd.get("full_name") ?? "").trim() || null },
    },
  });
  if (error) return { error: msg(error.message) };
  if (!data.session) return { ok: "Enviamos um link de confirmação para o seu e-mail." };
  redirect("/onboarding");
}

export async function signInWithGoogle(fd: FormData) {
  const supabase = await createClient();
  const next = safeNext(fd.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: msg(error.message) };
  return { ok: "Se o e-mail existir, você receberá um link para redefinir a senha." };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Mínimo de 8 caracteres." };
  if (password !== fd.get("confirm")) return { error: "As senhas não conferem." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: msg(error.message) };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
