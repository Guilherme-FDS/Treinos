import { notFound } from "next/navigation";
import { FoodBadges } from "@/components/food-badges";
import { Button, Card, fmt, LinkButton, PageHeader } from "@/components/ui";
import { deleteFood } from "@/lib/actions/foods";
import { requireProfile } from "@/lib/auth";
import { checkKcal } from "@/lib/calc";
import type { Food } from "@/lib/types";

export default async function FoodPage({ params }: PageProps<"/foods/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  const { data } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const food = data as Food;
  const check = checkKcal({ ...food, base_g: Number(food.base_g) });
  const mine = food.created_by === user.id && !food.verified;
  const rows: [string, number | null, string, number?][] = [
    ["Energia", food.kcal, "kcal"],
    ["Proteína", food.protein, "g", 1],
    ["Carboidrato total", food.carbs, "g", 1],
    ["Fibra", food.fiber, "g", 1],
    ["Gordura", food.fat, "g", 1],
    ["Sódio", food.sodium_mg, "mg"],
  ];

  return (
    <>
      <PageHeader title={food.name} back="/foods" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {food.brand && <span>{food.brand}</span>}
          {food.barcode && <span>EAN {food.barcode}</span>}
          {food.food_group && <span>{food.food_group}</span>}
          <FoodBadges food={food} />
        </div>
        <Card>
          <h2 className="mb-2 font-semibold">Por {fmt(food.base_g)} g</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {rows.map(([label, v, unit, d]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right">{v == null ? "não medido" : `${fmt(v, d)} ${unit}`}</dd>
              </div>
            ))}
            {food.serving_g && (
              <>
                <dt className="text-muted">Porção</dt>
                <dd className="text-right">{food.serving_label ?? ""} ({fmt(food.serving_g)} g)</dd>
              </>
            )}
          </dl>
          {check.suspect && (
            <p className="mt-3 rounded-lg bg-warn/15 p-2 text-sm text-warn">
              kcal declarada difere {fmt(check.divergence * 100)}% da estimada pelos macros ({fmt(check.estimated)} kcal).
            </p>
          )}
        </Card>
        {food.source_url && (
          <a href={food.source_url} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
            Ver fonte
          </a>
        )}
        <LinkButton href={`/diary/add?food=${food.id}`}>Adicionar ao diário</LinkButton>
        {mine && (
          <div className="flex gap-2">
            <LinkButton href={`/foods/${food.id}/edit`} variant="secondary" className="flex-1">Editar</LinkButton>
            <form action={deleteFood} className="flex-1">
              <input type="hidden" name="id" value={food.id} />
              <Button variant="danger" className="w-full">Excluir</Button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
