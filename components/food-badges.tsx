import { checkKcal } from "@/lib/calc";
import type { Food } from "@/lib/types";
import { Badge } from "./ui";

const SOURCE_LABEL: Record<Food["source"], string> = {
  taco: "TACO",
  off: "Open Food Facts",
  usda: "USDA",
  manual: "Manual",
  ai: "IA",
};

export function FoodBadges({ food }: { food: Food }) {
  const check = checkKcal({ ...food, base_g: Number(food.base_g) });
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={food.source === "taco" ? "accent" : "muted"}>{SOURCE_LABEL[food.source]}</Badge>
      {!food.verified && <Badge>não verificado</Badge>}
      {check.suspect && <Badge tone="warn">kcal suspeita</Badge>}
    </span>
  );
}
