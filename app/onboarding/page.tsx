import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata = { title: "Seu perfil" };

export default async function OnboardingPage() {
  await requireUser();
  const profile = await getProfile();
  if (profile?.onboarded_at) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-semibold">Vamos calcular suas metas</h1>
      <p className="mb-6 text-sm text-muted">Usamos esses dados para estimar basal, gasto diário, calorias, macros e água.</p>
      <ProfileForm profile={profile} redirectTo="dashboard" />
    </main>
  );
}
