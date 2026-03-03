import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateDailyTasks } from "@/lib/generate-tasks";
import type { AnalysisResult } from "@/lib/analyze-types";
import { getActiveSIP } from "@/lib/sip";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userName, lang } = await request.json();

    const sip = await getActiveSIP(user.id);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const today = new Date().toISOString().split("T")[0];

    // Check if tasks already exist for today
    const { data: existingTasks } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today);

    if (existingTasks && existingTasks.length > 0) {
      return NextResponse.json({ tasks: existingTasks, generated: false });
    }

    // Get all vision boards
    const { data: boards } = await supabase
      .from("vision_boards")
      .select("analysis")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const visionBoards: AnalysisResult[] = (boards ?? [])
      .map(b => b.analysis as AnalysisResult)
      .filter(Boolean);

    // Get focus areas
    const { data: focusData } = await supabase
      .from("user_focus_areas")
      .select("area")
      .eq("user_id", user.id);

    const focusAreas = (focusData ?? []).map(f => f.area);

    // Get recent tasks (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: recentTasks } = await supabase
      .from("daily_tasks")
      .select("task_text, goal_name, completed, date")
      .eq("user_id", user.id)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    // Generate tasks with AI
    const generated = await generateDailyTasks({
      visionBoards,
      focusAreas,
      recentTasks: recentTasks ?? [],
      userName: userName || "friend",
      lang: lang || "en",
    }, sip);

    // Save to database
    const toInsert = generated.map(t => ({
      user_id: user.id,
      task_text: t.task_text,
      goal_name: t.goal_name,
      completed: false,
      date: today,
    }));

    const { data: inserted } = await supabase
      .from("daily_tasks")
      .insert(toInsert)
      .select();

    return NextResponse.json({ tasks: inserted, generated: true });
  } catch (err) {
    console.error("Generate tasks error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
