"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 11, fill: "var(--muted)" };
const tooltip = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "var(--muted)" },
};

export function WeightChart({ data }: { data: { label: string; weight: number | null }[] }) {
  const vals = data.map((d) => d.weight).filter((v): v is number => v != null);
  if (vals.length < 1) return <p className="py-8 text-center text-sm text-muted">Registre seu peso para ver a evolução.</p>;
  const min = Math.floor(Math.min(...vals) - 1);
  const max = Math.ceil(Math.max(...vals) + 1);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[min, max]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltip} formatter={(v) => [`${v} kg`, "Peso"]} />
        <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function KcalWeekChart({ data, target }: { data: { label: string; kcal: number; burned: number }[]; target: number }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltip} formatter={(v, n) => [`${Math.round(Number(v))} kcal`, n === "kcal" ? "Consumido" : "Gasto"]} />
        <ReferenceLine y={target} stroke="var(--accent)" strokeDasharray="4 4" />
        <Bar dataKey="kcal" fill="var(--accent)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="burned" fill="var(--muted)" radius={[6, 6, 0, 0]} opacity={0.5} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExerciseHistoryChart({ data }: { data: { label: string; load: number; volume: number; e1rm: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={axis} tickLine={false} axisLine={false} />
        <YAxis yAxisId="v" orientation="right" tick={axis} tickLine={false} axisLine={false} hide />
        <Tooltip {...tooltip} formatter={(v, n) => [`${Math.round(Number(v))} kg`, n === "load" ? "Carga máx." : n === "e1rm" ? "1RM est." : "Volume"]} />
        <Line yAxisId="l" type="monotone" dataKey="load" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line yAxisId="l" type="monotone" dataKey="e1rm" stroke="var(--protein)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        <Line yAxisId="v" type="monotone" dataKey="volume" stroke="var(--carbs)" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
