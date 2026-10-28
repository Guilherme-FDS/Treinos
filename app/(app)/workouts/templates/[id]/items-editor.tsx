"use client";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import { ExercisePicker } from "@/components/exercise-picker";
import { Button, Card, Input, Select } from "@/components/ui";
import { addTemplateItem, deleteTemplateItem, reorderTemplateItems, updateTemplateItem } from "@/lib/actions/workouts";
import { METHOD_LABELS, type TemplateItem, type TrainingMethod } from "@/lib/types";

type Item = TemplateItem & { exercise_name: string };

export function ItemsEditor({ templateId, items: initial, editable }: { templateId: string; items: Item[]; editable: boolean }) {
  const [items, setItems] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    start(() => reorderTemplateItems(templateId, next.map((i) => i.id)));
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((it, idx) => (
            <Row key={it.id} item={it} index={idx} editable={editable} templateId={templateId} onRemoved={() => setItems((s) => s.filter((x) => x.id !== it.id))} />
          ))}
        </SortableContext>
      </DndContext>
      {items.length === 0 && <p className="py-4 text-center text-sm text-muted">Adicione exercícios à ficha.</p>}
      {editable && (
        <Button type="button" variant="secondary" onClick={() => setPicking(true)} disabled={pending}>
          + Adicionar exercício
        </Button>
      )}
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(e) => {
            setPicking(false);
            start(() => addTemplateItem(templateId, e.id));
          }}
        />
      )}
    </div>
  );
}

function Row({ item, index, editable, templateId, onRemoved }: { item: Item; index: number; editable: boolean; templateId: string; onRemoved: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !editable });
  const [v, setV] = useState({
    sets: String(item.sets),
    reps_min: item.reps_min?.toString() ?? "",
    reps_max: item.reps_max?.toString() ?? "",
    load_kg: item.load_kg?.toString() ?? "",
    rest_s: item.rest_s?.toString() ?? "",
    method: item.method,
    notes: item.notes ?? "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [, start] = useTransition();

  function save(next = v) {
    start(async () => {
      const r = await updateTemplateItem(item.id, { ...next, exercise_id: item.exercise_id, sets: Number(next.sets) });
      setStatus(r.error ?? "salvo");
      setTimeout(() => setStatus(null), 1500);
    });
  }
  const field = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value })),
    onBlur: () => save(),
    disabled: !editable,
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}>
      <Card className={isDragging ? "shadow-lg" : ""}>
        <div className="mb-2 flex items-center gap-2">
          {editable && (
            <button type="button" className="cursor-grab touch-none px-1 text-muted" aria-label="Arrastar" {...attributes} {...listeners}>
              ⋮⋮
            </button>
          )}
          <span className="text-sm text-muted">{index + 1}.</span>
          <p className="flex-1 font-medium">{item.exercise_name}</p>
          {status && <span className="text-xs text-muted">{status}</span>}
          {editable && (
            <button
              type="button"
              className="px-1 text-muted hover:text-danger"
              aria-label="Remover"
              onClick={() => start(async () => { await deleteTemplateItem(item.id, templateId); onRemoved(); })}
            >
              ×
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label>Séries<Input type="number" min={1} max={20} className="h-9" {...field("sets")} /></label>
          <label>Reps
            <div className="flex items-center gap-1">
              <Input type="number" min={1} className="h-9 px-2" {...field("reps_min")} />
              <span>-</span>
              <Input type="number" min={1} className="h-9 px-2" {...field("reps_max")} />
            </div>
          </label>
          <label>Carga (kg)<Input type="number" step="0.5" min={0} className="h-9" {...field("load_kg")} /></label>
          <label>Descanso (s)<Input type="number" step="5" min={0} className="h-9" {...field("rest_s")} /></label>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label>Método
            <Select className="h-9" {...field("method")} onChange={(e) => { const n = { ...v, method: e.target.value as TrainingMethod }; setV(n); save(n); }}>
              {Object.entries(METHOD_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </label>
          <label className="col-span-2">Observação<Input className="h-9" {...field("notes")} /></label>
        </div>
      </Card>
    </div>
  );
}
