// Validação de entrada (forms/server actions/API) com Zod.
import { z } from "zod";

const blank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida");
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (blank(v) ? null : v), z.coerce.number().min(min).max(max).nullable());
const optText = (max = 500) => z.preprocess((v) => (blank(v) ? null : v), z.string().trim().max(max).nullable());

export const credentialsSchema = z.object({
  email: z.email("e-mail inválido"),
  password: z.string().min(8, "mínimo de 8 caracteres"),
});

export const profileSchema = z
  .object({
    full_name: optText(120),
    sex: z.enum(["M", "F"]),
    birth_date: isoDate,
    height_cm: z.coerce.number().min(80).max(260),
    weight_kg: z.coerce.number().min(25).max(400),
    body_fat_pct: optNum(2, 70),
    occupation: z.enum(["escritorio", "em_pe_leve", "moderado", "bracal", "bracal_pesado"]),
    goal: z.enum(["emagrecer", "manter", "ganhar"]),
    pace_pct: z.coerce.number().min(0).max(25).default(20),
    protein_g_per_kg: z.coerce.number().min(1.6).max(2.2).default(1.8),
    fat_g_per_kg: z.coerce.number().min(0.6).max(1.0).default(0.8),
  })
  .refine((p) => p.goal !== "emagrecer" || (p.pace_pct >= 15 && p.pace_pct <= 25), {
    path: ["pace_pct"],
    message: "déficit entre 15% e 25%",
  })
  .refine((p) => Date.parse(p.birth_date) < Date.now(), { path: ["birth_date"], message: "data no futuro" });

export const weightLogSchema = z.object({
  logged_on: isoDate,
  weight_kg: z.coerce.number().min(25).max(400),
  body_fat_pct: optNum(2, 70),
  note: optText(200),
});

export const foodSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    brand: optText(120),
    barcode: z.preprocess(
      (v) => (blank(v) ? null : v),
      z.string().regex(/^\d{6,14}$/, "código de barras inválido").nullable(),
    ),
    food_group: optText(80),
    base_g: z.coerce.number().positive().max(10000).default(100),
    kcal: z.coerce.number().min(0).max(1000),
    protein: optNum(0, 100),
    carbs: optNum(0, 100),
    fat: optNum(0, 100),
    fiber: optNum(0, 100),
    sodium_mg: optNum(0, 100000),
    serving_g: optNum(0.1, 5000),
    serving_label: optText(60),
  })
  .refine((f) => f.fiber == null || f.carbs == null || f.fiber <= f.carbs, {
    path: ["fiber"],
    message: "fibra não pode exceder carboidrato total",
  })
  .refine((f) => (f.protein ?? 0) + (f.carbs ?? 0) + (f.fat ?? 0) <= f.base_g * 1.01, {
    path: ["carbs"],
    message: "soma de macros maior que a base",
  });

export const mealItemSchema = z.object({
  eaten_on: isoDate,
  meal_type: z.enum(["cafe", "almoco", "lanche", "jantar", "ceia"]),
  food_id: z.uuid(),
  grams: z.coerce.number().positive().max(5000),
  serving_qty: optNum(0.01, 100),
});

export const waterSchema = z.object({
  logged_on: isoDate,
  ml: z.coerce.number().int().min(1).max(5000),
});

export const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  muscle_group: optText(80),
  equipment: optText(80),
  type: z.enum(["musculacao", "cardio", "esporte", "mobilidade"]),
  met_light: optNum(1, 25),
  met_moderate: optNum(1, 25),
  met_vigorous: optNum(1, 25),
  instructions: optText(4000),
  video_url: z.preprocess(
    (v) => (blank(v) ? null : v),
    z.url().max(500).nullable(),
  ),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  goal: optText(200),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  notes: optText(1000),
  assigned_to: z.preprocess((v) => (blank(v) ? null : v), z.uuid().nullable()).default(null),
});

export const templateItemSchema = z
  .object({
    exercise_id: z.uuid(),
    sets: z.coerce.number().int().min(1).max(20),
    reps_min: optNum(1, 100),
    reps_max: optNum(1, 100),
    load_kg: optNum(0, 1000),
    rest_s: optNum(0, 900),
    method: z.enum(["normal", "bi-set", "drop-set", "piramide"]),
    notes: optText(300),
  })
  .refine((i) => i.reps_min == null || i.reps_max == null || i.reps_max >= i.reps_min, {
    path: ["reps_max"],
    message: "máximo < mínimo",
  });

export const workoutSetSchema = z.object({
  exercise_id: z.uuid(),
  set_index: z.number().int().min(0).max(100),
  reps: z.number().int().min(0).max(200),
  load_kg: z.number().min(0).max(1000),
  rest_s: z.number().int().min(0).max(900).nullable(),
});

export const finishWorkoutSchema = z.object({
  template_id: z.uuid().nullable(),
  name: z.string().trim().min(1).max(100),
  performed_on: isoDate,
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime(),
  sets: z.array(workoutSetSchema).min(1).max(300),
});

export const activitySchema = z.object({
  exercise_id: z.uuid(),
  performed_on: isoDate,
  duration_min: z.coerce.number().positive().max(600),
  intensity: z.enum(["light", "moderate", "vigorous"]),
});

/** Converte FormData em objeto simples (campos repetidos viram array). */
export function formToObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$")) continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      o[key] = [...((o[key] as unknown[]) ?? []), v];
    } else o[k] = v;
  }
  return o;
}

export function firstError(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "campo"}: ${i.message}` : "dados inválidos";
}
