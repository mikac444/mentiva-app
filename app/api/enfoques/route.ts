import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = request.nextUrl.searchParams.get("weekStart") || getWeekStart();

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("enfoques")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enfoques: data ?? [] });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enfoqueNames, northStarId } = await request.json();
  if (!enfoqueNames || !Array.isArray(enfoqueNames) || enfoqueNames.length === 0) {
    return NextResponse.json({ error: "enfoqueNames required (array)" }, { status: 400 });
  }
  if (enfoqueNames.length > 3) {
    return NextResponse.json({ error: "Maximum 3 enfoques" }, { status: 400 });
  }

  const weekStart = getWeekStart();
  const supabase = getAdminSupabase();

  await supabase
    .from("enfoques")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart);

  const rows = enfoqueNames.map((name: string) => ({
    user_id: userId,
    name: name.trim(),
    north_star_id: northStarId || null,
    week_start: weekStart,
  }));

  const { data, error } = await supabase
    .from("enfoques")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enfoques: data });
}
