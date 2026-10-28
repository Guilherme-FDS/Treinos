"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Food } from "@/lib/types";
import { BarcodeScanner } from "./barcode-scanner";
import { FoodBadges } from "./food-badges";
import { Button, Input, fmt } from "./ui";

/** Busca em cascata + scanner. `onSelect` recebe o alimento escolhido. */
export function FoodSearch({ onSelect, autoFocus }: { onSelect: (f: Food) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteTried, setRemoteTried] = useState(false);
  const [scan, setScan] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (query: string, remote?: boolean) => {
    ctrl.current?.abort();
    if (query.trim().length < 2) {
      setFoods([]);
      return;
    }
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setMessage(null);
    try {
      const url = `/api/foods/search?q=${encodeURIComponent(query)}${remote ? "&remote=1" : ""}`;
      const res = await fetch(url, { signal: c.signal });
      const j = (await res.json()) as { foods: Food[]; remote: boolean };
      setFoods(j.foods ?? []);
      setRemoteTried(j.remote || !!remote);
      if (!j.foods?.length) setMessage("Nada encontrado.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMessage("Erro na busca.");
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 300);
    return () => clearTimeout(t);
  }, [q, run]);

  const onDetect = useCallback(
    async (code: string) => {
      setScan(false);
      setQ(code);
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`);
        const j = (await res.json()) as { food: Food | null };
        if (j.food) onSelect(j.food);
        else setMessage(`Código ${code} não encontrado. Cadastre manualmente.`);
      } finally {
        setLoading(false);
      }
    },
    [onSelect],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          type="search"
          placeholder="Buscar alimento ou código de barras"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          enterKeyHint="search"
        />
        <Button type="button" variant="secondary" onClick={() => setScan(true)} aria-label="Escanear código de barras">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6v12M7 6v12M11 6v12M14 6v12M17 6v12M20 6v12" />
          </svg>
        </Button>
      </div>
      {loading && <p className="text-sm text-muted">Buscando…</p>}
      {message && !loading && (
        <p className="text-sm text-muted">
          {message}{" "}
          <a href={`/foods/new${/^\d{6,14}$/.test(q) ? `?barcode=${q}` : `?name=${encodeURIComponent(q)}`}`} className="text-accent underline">
            Cadastrar
          </a>
        </p>
      )}
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {foods.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onSelect(f)} className="flex w-full flex-col items-start gap-1 p-3 text-left hover:bg-bg">
              <span className="font-medium">
                {f.name}
                {f.brand && <span className="font-normal text-muted"> · {f.brand}</span>}
              </span>
              <span className="text-xs text-muted">
                {fmt(f.kcal)} kcal · P {fmt(f.protein, 1)} · C {fmt(f.carbs, 1)} · G {fmt(f.fat, 1)} / {fmt(f.base_g)} g
              </span>
              <FoodBadges food={f} />
            </button>
          </li>
        ))}
      </ul>
      {q.trim().length >= 3 && !remoteTried && !loading && (
        <Button type="button" variant="ghost" size="sm" onClick={() => run(q, true)}>
          Buscar também no Open Food Facts
        </Button>
      )}
      {scan && <BarcodeScanner onDetect={onDetect} onClose={() => setScan(false)} />}
    </div>
  );
}
