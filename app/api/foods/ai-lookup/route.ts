import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// FASE 2 (stub): ver lib/ai-food.ts

const requestSchema = z.object({ query: z.string().min(2).max(200) });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "query obrigatória" }, { status: 400 });

  return NextResponse.json(
    { error: "not_implemented", message: "Busca por IA disponível na Fase 2.", query: body.data.query, foods: [] },
    { status: 501 },
  );
}
