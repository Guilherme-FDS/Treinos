"use client";
import { useActionState, useState } from "react";
import { saveFood } from "@/lib/actions/foods";
import { checkKcal } from "@/lib/calc";
import type { Food } from "@/lib/types";
import { FormMessage, SubmitButton } from "./form";
import { Field, Input, fmt } from "./ui";

type Values = Partial<Record<"kcal" | "protein" | "carbs" | "fat" | "fiber", string>>;

export function FoodForm({ food, defaults, back }: { food?: Food; defaults?: { name?: string; barcode?: string }; back?: string }) {
  const [state, action] = useActionState(saveFood, undefined);
  const [v, setV] = useState<Values>({
    kcal: food?.kcal?.toString(),
    protein: food?.protein?.toString(),
    carbs: food?.carbs?.toString(),
    fat: food?.fat?.toString(),
    fiber: food?.fiber?.toString(),
  });
  const num = (s?: string) => (s ? Number(s) : null);
  const check =
    v.kcal && (v.protein || v.carbs || v.fat)
      ? checkKcal({ base_g: 100, kcal: Number(v.kcal), protein: num(v.protein), carbs: num(v.carbs), fat: num(v.fat), fiber: num(v.fiber), sodium_mg: null, source: "manual" })
      : null;
  const bind = (k: keyof Values) => ({
    name: k,
    value: v[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value })),
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      {food && <input type="hidden" name="$id" value={food.id} />}
      {back && <input type="hidden" name="$back" value={back} />}
      <Field label="Nome">
        <Input name="name" defaultValue={food?.name ?? defaults?.name ?? ""} required maxLength={200} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca">
          <Input name="brand" defaultValue={food?.brand ?? ""} />
        </Field>
        <Field label="Código de barras">
          <Input name="barcode" inputMode="numeric" pattern="\d{6,14}" defaultValue={food?.barcode ?? defaults?.barcode ?? ""} />
        </Field>
      </div>
      <Field label="Grupo">
        <Input name="food_group" defaultValue={food?.food_group ?? ""} placeholder="ex.: Laticínios" />
      </Field>
      <input type="hidden" name="base_g" value="100" />
      <fieldset className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-3">
        <legend className="px-1 text-sm font-medium">Por 100 g</legend>
        <Field label="Energia (kcal)">
          <Input type="number" step="0.1" min={0} inputMode="decimal" required {...bind("kcal")} />
        </Field>
        <Field label="Proteína (g)">
          <Input type="number" step="0.01" min={0} inputMode="decimal" {...bind("protein")} />
        </Field>
        <Field label="Carboidrato total (g)" hint="inclui fibra">
          <Input type="number" step="0.01" min={0} inputMode="decimal" {...bind("carbs")} />
        </Field>
        <Field label="Gordura (g)">
          <Input type="number" step="0.01" min={0} inputMode="decimal" {...bind("fat")} />
        </Field>
        <Field label="Fibra (g)">
          <Input type="number" step="0.01" min={0} inputMode="decimal" {...bind("fiber")} />
        </Field>
        <Field label="Sódio (mg)">
          <Input name="sodium_mg" type="number" step="0.1" min={0} inputMode="decimal" defaultValue={food?.sodium_mg ?? ""} />
        </Field>
      </fieldset>
      {check && (
        <p className={`rounded-lg p-2 text-sm ${check.suspect ? "bg-warn/15 text-warn" : "bg-accent/10 text-accent"}`}>
          Estimado pelos macros: {fmt(check.estimated)} kcal ({fmt(check.divergence * 100)}% de diferença)
          {check.suspect && " — confira os valores do rótulo."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Porção (g)">
          <Input name="serving_g" type="number" step="0.1" min={0.1} inputMode="decimal" defaultValue={food?.serving_g ?? ""} />
        </Field>
        <Field label="Descrição da porção">
          <Input name="serving_label" defaultValue={food?.serving_label ?? ""} placeholder="1 fatia" />
        </Field>
      </div>
      <SubmitButton>Salvar alimento</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
