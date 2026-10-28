"use client";
import { useActionState, useState } from "react";
import { FoodBadges } from "@/components/food-badges";
import { FoodSearch } from "@/components/food-search";
import { FormMessage, SubmitButton } from "@/components/form";
import { Button, Card, Field, Input, Select, fmt } from "@/components/ui";
import { addMealItem } from "@/lib/actions/diary";
import { scaleNutrients } from "@/lib/calc";
import { MEAL_LABELS, MEAL_TYPES, type Food, type MealType } from "@/lib/types";

export function AddFood({ day, meal, initialFood }: { day: string; meal: MealType; initialFood: Food | null }) {
  const [food, setFood] = useState<Food | null>(initialFood);
  if (!food) return <FoodSearch onSelect={setFood} autoFocus />;
  return <Quantity key={food.id} food={food} day={day} meal={meal} onBack={() => setFood(null)} />;
}

function Quantity({ food, day, meal, onBack }: { food: Food; day: string; meal: MealType; onBack: () => void }) {
  const [state, action] = useActionState(addMealItem, undefined);
  const hasServing = !!food.serving_g;
  const [mode, setMode] = useState<"g" | "porcao">(hasServing ? "porcao" : "g");
  const [grams, setGrams] = useState(hasServing ? String(food.serving_g) : "100");
  const [qty, setQty] = useState("1");
  const g = mode === "g" ? Number(grams) || 0 : (Number(qty) || 0) * Number(food.serving_g);
  const n = scaleNutrients({ ...food, base_g: Number(food.base_g) }, g);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{food.name}</p>
            {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
            <FoodBadges food={food} />
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onBack}>Trocar</Button>
        </div>
      </Card>
      <input type="hidden" name="food_id" value={food.id} />
      <input type="hidden" name="eaten_on" value={day} />
      <input type="hidden" name="grams" value={g || ""} />
      {mode === "porcao" && <input type="hidden" name="serving_qty" value={qty} />}
      <Field label="Refeição">
        <Select name="meal_type" defaultValue={meal}>
          {MEAL_TYPES.map((t) => <option key={t} value={t}>{MEAL_LABELS[t]}</option>)}
        </Select>
      </Field>
      {hasServing && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-border/40 p-1 text-sm">
          {(["porcao", "g"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg py-2 ${mode === m ? "bg-card font-medium shadow-sm" : "text-muted"}`}>
              {m === "g" ? "Gramas" : `Porção (${food.serving_label ?? `${fmt(food.serving_g)} g`})`}
            </button>
          ))}
        </div>
      )}
      {mode === "g" ? (
        <Field label="Quantidade (g)">
          <Input type="number" inputMode="decimal" step="any" min={1} value={grams} onChange={(e) => setGrams(e.target.value)} autoFocus />
        </Field>
      ) : (
        <Field label="Porções" hint={`${fmt(g)} g`}>
          <Input type="number" inputMode="decimal" step="any" min={0.25} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
      )}
      <Card className="grid grid-cols-4 gap-2 text-center text-sm">
        <div><p className="text-lg font-semibold">{fmt(n.kcal)}</p><p className="text-xs text-muted">kcal</p></div>
        <div><p className="text-lg font-semibold text-protein">{fmt(n.protein, 1)}</p><p className="text-xs text-muted">prot</p></div>
        <div><p className="text-lg font-semibold text-carbs">{fmt(n.carbs, 1)}</p><p className="text-xs text-muted">carbo</p></div>
        <div><p className="text-lg font-semibold text-fat">{fmt(n.fat, 1)}</p><p className="text-xs text-muted">gord</p></div>
      </Card>
      <SubmitButton>Adicionar</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
