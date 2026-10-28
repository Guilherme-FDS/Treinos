"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, ExerciseType } from "@/lib/types";
import { Button, Input } from "./ui";

type Row = Pick<Exercise, "id" | "name" | "muscle_group" | "equipment" | "type">;

export function ExercisePicker({ onPick, onClose, types }: { onPick: (e: Row) => void; onClose: () => void; types?: ExerciseType[] }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const supabase = createClient();
      let query = supabase.from("exercises").select("id, name, muscle_group, equipment, type").order("name").limit(40);
      if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
      if (types?.length) query = query.in("type", types);
      const { data } = await query;
      setRows((data as Row[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, types]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg p-4">
      <div className="mb-3 flex gap-2">
        <Input autoFocus type="search" placeholder="Buscar exercício" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
      <ul className="flex-1 divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-card">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" className="w-full p-3 text-left hover:bg-bg" onClick={() => onPick(r)}>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted">{[r.muscle_group, r.equipment].filter(Boolean).join(" · ")}</p>
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted">Nada encontrado.</li>}
      </ul>
    </div>
  );
}
