import { FoodForm } from "@/components/food-form";
import { PageHeader } from "@/components/ui";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Novo alimento" };

export default async function NewFoodPage({ searchParams }: { searchParams: Promise<{ barcode?: string; name?: string; back?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Novo alimento" back="/foods" />
      <FoodForm defaults={{ barcode: sp.barcode, name: sp.name }} back={sp.back ? safeNext(sp.back) : undefined} />
    </>
  );
}
