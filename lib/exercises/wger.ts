// Normalização de exercícios da API pública do wger (CC-BY-SA 4.0).

export const WGER_API = "https://wger.de/api/v2";
export const PT = 7;
export const EN = 2;

export const CATEGORY_PT: Record<string, string> = {
  Abs: "Abdômen",
  Arms: "Braços",
  Back: "Costas",
  Calves: "Panturrilhas",
  Cardio: "Cardio",
  Chest: "Peito",
  Legs: "Pernas",
  Shoulders: "Ombros",
};

export const EQUIPMENT_PT: Record<string, string> = {
  Barbell: "Barra",
  Bench: "Banco",
  "Cable machine": "Polia / cabo",
  Dumbbell: "Halter",
  "Gym mat": "Colchonete",
  "Incline bench": "Banco inclinado",
  Kettlebell: "Kettlebell",
  "Pull-up bar": "Barra fixa",
  "Resistance band": "Elástico",
  "SZ-Bar": "Barra W",
  "Swiss Ball": "Bola suíça",
  "none (bodyweight exercise)": "Peso corporal",
};

export const MUSCLE_PT: Record<string, string> = {
  "Anterior deltoid": "Deltoide anterior",
  "Biceps brachii": "Bíceps",
  "Biceps femoris": "Posterior de coxa",
  Brachialis: "Braquial",
  Gastrocnemius: "Panturrilha",
  "Gluteus maximus": "Glúteos",
  "Latissimus dorsi": "Dorsal",
  "Obliquus externus abdominis": "Oblíquos",
  "Pectoralis major": "Peitoral",
  "Quadriceps femoris": "Quadríceps",
  "Rectus abdominis": "Abdômen",
  "Serratus anterior": "Serrátil",
  Soleus: "Sóleo",
  Trapezius: "Trapézio",
  "Triceps brachii": "Tríceps",
};

type Named = { id: number; name: string };
export type WgerTranslation = { name: string; description: string; language: number; license_author?: string };
export type WgerExerciseInfo = {
  id: number;
  uuid: string;
  category: Named;
  muscles: Named[];
  equipment: Named[];
  license: { short_name: string; url: string };
  license_author: string | null;
  images: { image: string; is_main: boolean; license_author?: string }[];
  videos?: { video: string; is_main: boolean }[];
  translations: WgerTranslation[];
};

export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|li|ol|ul)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Converte um exerciseinfo do wger em linha de exercises. null = sem nome PT/EN ou categoria Cardio. */
export function wgerToExercise(e: WgerExerciseInfo) {
  if (e.category?.name === "Cardio") return null;
  const pt = e.translations.find((t) => t.language === PT && t.name.trim());
  const en = e.translations.find((t) => t.language === EN && t.name.trim());
  const tr = pt ?? en;
  if (!tr) return null;

  const mainMuscle = e.muscles[0]?.name;
  const muscle_group = (mainMuscle && MUSCLE_PT[mainMuscle]) || CATEGORY_PT[e.category?.name] || e.category?.name || null;
  const equipment = e.equipment.map((q) => EQUIPMENT_PT[q.name] ?? q.name).join(", ") || null;
  const image = e.images.find((i) => i.is_main) ?? e.images[0];
  const video = e.videos?.find((v) => v.is_main) ?? e.videos?.[0];
  const authors = [e.license_author, tr.license_author].filter(Boolean).join(", ");

  return {
    name: tr.name.trim(),
    muscle_group,
    equipment,
    type: "musculacao" as const,
    met_light: 3.5,
    met_moderate: 5.0,
    met_vigorous: 6.0,
    instructions: tr.description ? stripHtml(tr.description) || null : null,
    image_url: image?.image ?? null,
    video_url: video?.video ?? null,
    source: "wger",
    source_ref: String(e.id),
    source_url: `https://wger.de/pt/exercise/${e.id}/view-base`,
    license: e.license?.short_name ?? "CC-BY-SA 4",
    attribution: `wger.de${authors ? ` — ${authors}` : ""} (${e.license?.short_name ?? "CC-BY-SA 4"})`,
    created_by: null,
  };
}
