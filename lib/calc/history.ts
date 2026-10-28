// Histórico por exercício: agrega séries por sessão e calcula recordes pessoais.
import { epley1RM, setVolume } from "./training";

export type HistorySet = { workout_id: string; performed_on: string; reps: number; load_kg: number };

export type SessionStat = {
  workout_id: string;
  performed_on: string;
  sets: number;
  maxLoad: number;
  volume: number;
  bestE1rm: number;
};

export type PersonalRecords = {
  maxLoad: { value: number; reps: number; date: string } | null;
  bestE1rm: { value: number; date: string } | null;
  maxVolume: { value: number; date: string } | null;
};

export function sessionStats(sets: HistorySet[]): SessionStat[] {
  const by = new Map<string, SessionStat>();
  for (const s of sets) {
    if (s.reps <= 0) continue;
    const cur = by.get(s.workout_id) ?? {
      workout_id: s.workout_id,
      performed_on: s.performed_on,
      sets: 0,
      maxLoad: 0,
      volume: 0,
      bestE1rm: 0,
    };
    cur.sets++;
    cur.maxLoad = Math.max(cur.maxLoad, s.load_kg);
    cur.volume += setVolume(s.reps, s.load_kg);
    cur.bestE1rm = Math.max(cur.bestE1rm, epley1RM(s.reps, s.load_kg));
    by.set(s.workout_id, cur);
  }
  return [...by.values()].sort((a, b) => a.performed_on.localeCompare(b.performed_on));
}

export function personalRecords(sets: HistorySet[]): PersonalRecords {
  const valid = sets.filter((s) => s.reps > 0);
  if (!valid.length) return { maxLoad: null, bestE1rm: null, maxVolume: null };
  const top = valid.reduce((a, s) => (s.load_kg > a.load_kg || (s.load_kg === a.load_kg && s.reps > a.reps) ? s : a));
  const e1 = valid.reduce((a, s) => (epley1RM(s.reps, s.load_kg) > epley1RM(a.reps, a.load_kg) ? s : a));
  const sessions = sessionStats(valid);
  const vol = sessions.reduce((a, s) => (s.volume > a.volume ? s : a));
  return {
    maxLoad: { value: top.load_kg, reps: top.reps, date: top.performed_on },
    bestE1rm: { value: Math.round(epley1RM(e1.reps, e1.load_kg) * 10) / 10, date: e1.performed_on },
    maxVolume: { value: vol.volume, date: vol.performed_on },
  };
}
