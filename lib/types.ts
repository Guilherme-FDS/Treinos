// Tipos de domínio espelhando o schema (supabase/migrations).
import type { Goal, Intensity, Occupation, Sex } from "@/lib/calc";

export type Role = "user" | "personal" | "admin";
export type FoodSource = "taco" | "off" | "usda" | "manual" | "ai";
export type MealType = "cafe" | "almoco" | "lanche" | "jantar" | "ceia";
export type ExerciseType = "musculacao" | "cardio" | "esporte" | "mobilidade";
export type TrainingMethod = "normal" | "bi-set" | "drop-set" | "piramide";

export const MEAL_TYPES: MealType[] = ["cafe", "almoco", "lanche", "jantar", "ceia"];
export const MEAL_LABELS: Record<MealType, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  musculacao: "Musculação",
  cardio: "Cardio",
  esporte: "Esporte",
  mobilidade: "Mobilidade",
};
export const METHOD_LABELS: Record<TrainingMethod, string> = {
  normal: "Normal",
  "bi-set": "Bi-set",
  "drop-set": "Drop-set",
  piramide: "Pirâmide",
};
export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  occupation: Occupation | null;
  goal: Goal | null;
  pace_pct: number;
  protein_g_per_kg: number;
  fat_g_per_kg: number;
  onboarded_at: string | null;
};

export type Food = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  food_group: string | null;
  base_g: number;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
  serving_g: number | null;
  serving_label: string | null;
  source: FoodSource;
  source_ref: string | null;
  source_url: string | null;
  verified: boolean;
  created_by: string | null;
};

export type MealItem = {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name: string;
  grams: number;
  serving_qty: number | null;
  serving_label: string | null;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
};

export type Meal = {
  id: string;
  eaten_on: string;
  meal_type: MealType;
  is_favorite: boolean;
  favorite_name: string | null;
  meal_items: MealItem[];
};

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  type: ExerciseType;
  met_light: number | null;
  met_moderate: number | null;
  met_vigorous: number | null;
  instructions: string | null;
  video_url: string | null;
  image_url: string | null;
  source: string;
  source_url: string | null;
  license: string | null;
  attribution: string | null;
  created_by: string | null;
};

export type TemplateItem = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  load_kg: number | null;
  rest_s: number | null;
  method: TrainingMethod;
  notes: string | null;
  exercise?: Exercise;
};

export type WorkoutTemplate = {
  id: string;
  owner_id: string;
  assigned_to: string | null;
  name: string;
  goal: string | null;
  weekdays: number[];
  notes: string | null;
  archived: boolean;
  items?: TemplateItem[];
};

export type Workout = {
  id: string;
  user_id: string;
  template_id: string | null;
  exercise_id: string | null;
  name: string;
  performed_on: string;
  duration_min: number;
  type: ExerciseType;
  intensity: Intensity | null;
  met: number;
  weight_kg: number;
  kcal: number;
};

export type DailyTargets = {
  effective_from: string;
  weight_kg: number;
  bmr_kcal: number;
  bmr_formula: "mifflin" | "katch";
  activity_factor: number;
  maintenance_kcal: number;
  target_kcal: number;
  adjust_pct: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  water_ml: number;
};
