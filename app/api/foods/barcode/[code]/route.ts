import { NextResponse, type NextRequest } from "next/server";
import { findByBarcode } from "@/lib/foods";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: NextRequest, ctx: RouteContext<"/api/foods/barcode/[code]">) {
  const { code } = await ctx.params;
  if (!/^\d{6,14}$/.test(code)) return NextResponse.json({ error: "código inválido" }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const food = await findByBarcode(supabase, user.id, code);
  return food ? NextResponse.json({ food }) : NextResponse.json({ food: null }, { status: 404 });
}
