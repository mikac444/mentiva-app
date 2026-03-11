import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/journal?days=7  (days=0 or days=all → return all entries)
export async function GET(request: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days") || "all";
    const days = daysParam === "all" ? 0 : parseInt(daysParam);

    const supabase = getAdminSupabase();

    let query = supabase
      .from("journal_entries")
      .select("id, content, date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Only apply date filter if days > 0
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte("date", since.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    console.error("Journal GET error:", err);
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}

// POST /api/journal { content: string }
export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user.id,
        content: content.trim(),
        date: today,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error("Journal POST error:", err);
    return NextResponse.json({ error: "Failed to save journal entry" }, { status: 500 });
  }
}
