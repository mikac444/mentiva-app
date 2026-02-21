import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateMissionTasks } from "@/lib/generate-mission-tasks";
import { getActiveSIP } from "@/lib/sip";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

async function getStreak(supabase: ReturnType<typeof getAdminSupabase>, userId: string): Promise<number> {
  const { data } = await supabase
    .from("streaks")
    .select("date, non_negotiable_completed")
    .eq("user_id", userId)
    .eq("non_negotiable_completed", true)
    .order("date", { ascending: false })
    .limit(60);

  const rows = data as { date: string; non_negotiable_completed: boolean }[] | null;
  if (!rows || rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1);

  for (const row of rows) {
    const rowDate = row.date;
    const expected = checkDate.toISOString().split("T")[0];
    if (rowDate === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (rowDate === todayStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;
    const userName = user.user_metadata?.full_name?.split(/\s+/)[0]
      ?? user.user_metadata?.name?.split(/\s+/)[0]
      ?? "friend";

    const { lang, forceRegenerate } = await request.json();
    const supabase = getAdminSupabase();
    const today = new Date().toISOString().split("T")[0];

    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .order("sort_order", { ascending: true });

      if (existing && existing.length > 0) {
        if (!lang || existing[0].lang === lang) {
          return NextResponse.json({ missions: existing, generated: false });
        }
      }
    }

    await supabase
      .from("daily_tasks")
      .delete()
      .eq("user_id", userId)
      .eq("date", today);

    const { data: northStar } = await supabase
      .from("north_stars")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!northStar) {
      return NextResponse.json({ error: "No North Star set" }, { status: 400 });
    }

    const weekStart = getWeekStart();
    const { data: enfoques } = await supabase
      .from("enfoques")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart);

    if (!enfoques || enfoques.length === 0) {
      return NextResponse.json({ error: "No enfoques set for this week" }, { status: 400 });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: recentTasks } = await supabase
      .from("daily_tasks")
      .select("task_text, task_type, completed, date")
      .eq("user_id", userId)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    const currentStreak = await getStreak(supabase, userId);
    const sip = await getActiveSIP(userId);

    const result = await generateMissionTasks({
      northStar: northStar.goal_text,
      enfoques: enfoques.map((e: { name: string; id: string }) => ({ name: e.name, id: e.id })),
      recentTasks: (recentTasks ?? []).map((t: { task_text: string; task_type: string; completed: boolean; date: string }) => ({
        task_text: t.task_text,
        task_type: t.task_type || "secondary",
        completed: t.completed,
        date: t.date,
      })),
      userName,
      lang: lang || "en",
      currentStreak,
    }, sip);

    const sortOrderMap: Record<string, number> = { non_negotiable: 0, secondary: 1, micro: 2 };
    const toInsert = result.missions.map((m) => ({
      user_id: userId,
      task_text: m.task_text,
      goal_name: m.enfoque_name,
      task_type: m.task_type,
      enfoque_name: m.enfoque_name,
      estimated_minutes: m.estimated_minutes,
      completed: false,
      date: today,
      lang: lang || "en",
      sort_order: sortOrderMap[m.task_type] ?? 1,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("daily_tasks")
      .insert(toInsert)
      .select();

    if (insertError) {
      console.error("Failed to save missions:", insertError);
      return NextResponse.json({ error: "Failed to save missions" }, { status: 500 });
    }

    await supabase
      .from("streaks")
      .upsert({
        user_id: userId,
        date: today,
        non_negotiable_completed: false,
      }, { onConflict: "user_id,date" });

    return NextResponse.json({
      missions: inserted,
      motivational_pulse: result.motivational_pulse,
      streak: currentStreak,
      generated: true,
    });
  } catch (err) {
    console.error("Generate missions error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate missions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
