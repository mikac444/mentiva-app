import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, lang } = await request.json();
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    const supabase = getAdminSupabase();

    const { data: task } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.task_type === "non_negotiable") {
      return NextResponse.json({ error: "Cannot swap non-negotiable task" }, { status: 400 });
    }

    const { data: todayTasks } = await supabase
      .from("daily_tasks")
      .select("task_text")
      .eq("user_id", user.id)
      .eq("date", task.date);

    const existingTexts = (todayTasks ?? []).map((t: { task_text: string }) => t.task_text).join("\n");

    const { data: northStar } = await supabase
      .from("north_stars")
      .select("goal_text")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const langName = (lang || "en") === "es" ? "SPANISH" : "ENGLISH";
    const taskTypeLabel = task.task_type === "micro" ? "MICRO WIN (under 5 minutes)" : "SECONDARY (10-20 minutes)";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Generate ONE alternative ${taskTypeLabel} task. ALL text in ${langName}.

NORTH STAR: ${northStar?.goal_text || "General improvement"}
ENFOQUE: ${task.enfoque_name}

DO NOT repeat any of these existing tasks:
${existingTexts}

The original task was: "${task.task_text}"
Generate something DIFFERENT but in the same enfoque.

Respond ONLY with JSON:
{"task_text": "...", "estimated_minutes": N}`,
      }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text)
      .join("");

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const newTask = JSON.parse(cleaned);

    const { data: updated, error } = await supabase
      .from("daily_tasks")
      .update({
        task_text: String(newTask.task_text),
        estimated_minutes: Math.max(1, Math.min(60, Number(newTask.estimated_minutes) || 15)),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("Swap task error:", err);
    const message = err instanceof Error ? err.message : "Failed to swap task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
