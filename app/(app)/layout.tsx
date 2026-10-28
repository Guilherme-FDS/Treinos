import { BottomNav } from "@/components/nav";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
    </>
  );
}
