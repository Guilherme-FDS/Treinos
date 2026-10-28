import { PageHeader, LinkButton } from "@/components/ui";
import { FoodBrowser } from "./food-browser";

export const metadata = { title: "Alimentos" };

export default function FoodsPage() {
  return (
    <>
      <PageHeader title="Alimentos" action={<LinkButton href="/foods/new" size="sm">Novo</LinkButton>} />
      <FoodBrowser />
    </>
  );
}
