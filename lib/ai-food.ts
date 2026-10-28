import { z } from "zod";

/**
 * FASE 2 (stub). Futuramente: chamar a API da Anthropic (Claude + web search) no server
 * com ANTHROPIC_API_KEY, pedir JSON no formato de `aiFoodSchema`, validar com
 * lib/calc/nutrition.checkKcal e salvar em foods (source='ai', verified=false).
 * OCR de tabela nutricional por foto entra no mesmo fluxo (imagem → JSON → validação).
 */
export const aiFoodSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable(),
  barcode: z.string().regex(/^\d{6,14}$/).nullable(),
  base_g: z.literal(100),
  kcal: z.number().min(0).max(950),
  protein: z.number().min(0).max(100).nullable(),
  carbs: z.number().min(0).max(100).nullable(),
  fat: z.number().min(0).max(100).nullable(),
  fiber: z.number().min(0).max(100).nullable(),
  sodium_mg: z.number().min(0).nullable(),
  serving_g: z.number().positive().nullable(),
  serving_label: z.string().nullable(),
  source: z.literal("ai"),
  source_url: z.url().nullable(),
  verified: z.literal(false),
});

