import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}

async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("north_stars")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("North Star GET DB error:", error.message);
      return NextResponse.json({ error: "Failed to fetch North Star" }, { status: 500 });
    }
    return NextResponse.json({ northStar: data });
  } catch (err) {
    console.error("North Star GET error:", err);
    return NextResponse.json({ error: "Failed to fetch North Star" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { goalText, sourceBoardId } = await request.json();
    if (!goalText || typeof goalText !== "string" || !goalText.trim()) {
      return NextResponse.json({ error: "goalText is required and must be a non-empty string" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    await supabase
      .from("north_stars")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("north_stars")
      .insert({
        user_id: userId,
        goal_text: goalText.trim(),
        source_board_id: sourceBoardId || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("North Star POST DB error:", error.message);
      return NextResponse.json({ error: "Failed to save North Star" }, { status: 500 });
    }
    return NextResponse.json({ northStar: data });
  } catch (err) {
    console.error("North Star POST error:", err);
    return NextResponse.json({ error: "Failed to save North Star" }, { status: 500 });
  }
}
