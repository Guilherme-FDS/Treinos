import { NextResponse, type NextRequest } from "next/server";
import { searchFoods } from "@/lib/foods";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const remoteParam = req.nextUrl.searchParams.get("remote");
  const result = await searchFoods(supabase, user.id, q, {
    remote: remoteParam == null ? undefined : remoteParam === "1",
  });
  return NextResponse.json(result);
}
