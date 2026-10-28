import { addWater, undoWater } from "@/lib/actions/diary";
import { Button, Card, fmt, Progress } from "./ui";

export function WaterCard({ day, ml, target }: { day: string; ml: number; target: number }) {
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-semibold">Água</h2>
        <span className="text-sm text-muted">
          <span className="font-semibold text-fg">{fmt(ml)}</span> / {fmt(target)} ml
        </span>
      </div>
      <Progress value={ml} max={target} color="var(--water)" />
      <div className="mt-3 flex flex-wrap gap-2">
        {[200, 300, 500].map((v) => (
          <form key={v} action={addWater}>
            <input type="hidden" name="logged_on" value={day} />
            <input type="hidden" name="ml" value={v} />
            <Button size="sm" variant="secondary">+{v} ml</Button>
          </form>
        ))}
        <form action={addWater} className="flex gap-1">
          <input type="hidden" name="logged_on" value={day} />
          <input name="ml" type="number" min={1} max={5000} placeholder="ml" className="h-9 w-20 rounded-xl border border-border bg-card px-2 text-sm" required />
          <Button size="sm" variant="secondary">+</Button>
        </form>
        {ml > 0 && (
          <form action={undoWater}>
            <input type="hidden" name="date" value={day} />
            <Button size="sm" variant="ghost">Desfazer</Button>
          </form>
        )}
      </div>
    </Card>
  );
}
