import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { getActiveSIP } from "@/lib/sip";

export const dynamic = "force-dynamic";

function getMondayDate(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export async function POST(request: Request) {
  try {
    const { userId, userName, lang, focusGoals, context, weekStart } = await request.json();
    if (!userId || !focusGoals || focusGoals.length === 0) {
      return NextResponse.json({ error: "userId and focusGoals required" }, { status: 400 });
    }

    const sip = await getActiveSIP(userId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Save weekly plan
    const mondayDate = weekStart || getMondayDate();
    await supabase.from("weekly_plans").upsert({
      user_id: userId,
      week_start: mondayDate,
      focus_goals: focusGoals,
      context: context || {},
    }, { onConflict: "user_id,week_start" });

    // Update focus areas
    await supabase.from("user_focus_areas").delete().eq("user_id", userId);
    await supabase.from("user_focus_areas").insert(
      focusGoals.map((g: string) => ({ user_id: userId, area: g }))
    );

    // Get recent tasks
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: recentTasks } = await supabase
      .from("daily_tasks").select("task_text, goal_name, completed, date")
      .eq("user_id", userId).gte("date", weekAgo.toISOString().split("T")[0]);

    // Delete today's tasks and regenerate
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_tasks").delete().eq("user_id", userId).eq("date", today);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const anthropic = new Anthropic({ apiKey });
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

    const contextDetails = Object.entries(context || {})
      .map(([goal, detail]) => `- ${goal}: "${detail}"`).join("\n");

    const recentCompleted = (recentTasks ?? []).filter(t => t.completed).map(t => `[DONE] ${t.task_text}`).join("\n");
    const recentSkipped = (recentTasks ?? []).filter(t => !t.completed).map(t => `[NOT DONE] ${t.task_text}`).join("\n");

    const skipCounts: Record<string, number> = {};
    for (const t of (recentTasks ?? []).filter(t => !t.completed)) {
      const key = t.task_text.toLowerCase().trim();
      skipCounts[key] = (skipCounts[key] || 0) + 1;
    }
    const frequentlySkipped = Object.entries(skipCounts).filter(([, c]) => c >= 2).map(([t]) => t);

    const prompt = `You are Menti, an AI life mentor. Generate daily tasks for ${userName} for today (${dayOfWeek}).

THE USER CHOSE THESE FOCUS GOALS FOR THIS WEEK:
${focusGoals.join(", ")}

THE USER'S CONTEXT FOR EACH GOAL:
${contextDetails || "No additional context provided."}

RECENTLY COMPLETED (last 7 days):
${recentCompleted || "None yet."}

RECENTLY NOT COMPLETED:
${recentSkipped || "None."}

FREQUENTLY SKIPPED (2+ times):
${frequentlySkipped.length > 0 ? frequentlySkipped.join(", ") : "None."}

${isWeekend ? "TODAY IS A WEEKEND — lighter tasks, max 3 total." : ""}

STRICT RULES:
1. Generate exactly 3 NON-NEGOTIABLE tasks (type: "core") + 2 BONUS tasks (type: "bonus"). On weekends: 2 core + 1 bonus.
2. Tasks MUST directly relate to the user's chosen focus goals and their specific context. NEVER generate tasks for life areas or categories the user did not explicitly choose.
3. VARIETY: Spread tasks across the selected focus goals only — do not add tasks from other areas.
4. Each task must include a time estimate in parentheses.
5. If a task has been frequently skipped, make it SMALLER.
6. goal_name must be SHORT (1-3 words) in the SAME language as tasks.
7. ALL text in ${lang === "es" ? "SPANISH" : "ENGLISH"}.
8. Include at least one quick win (under 5 min) in core tasks.

Respond ONLY with valid JSON array:
[{"task_text": "...", "goal_name": "...", "priority": "high|medium|low", "type": "core|bonus"}]`;

    const finalSystemPrompt = sip ? `${sip}\n\n---\n\nTASK GENERATION INSTRUCTIONS:\n${prompt}` : prompt;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: finalSystemPrompt,
      messages: [{ role: "user", content: "Generate my daily tasks for today based on the instructions." }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text).join("");

    let tasks;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      tasks = JSON.parse(cleaned);
      if (!Array.isArray(tasks)) throw new Error("Not an array");
    } catch {
      console.error("Failed to parse tasks:", text);
      return NextResponse.json({ error: "Failed to generate tasks" }, { status: 500 });
    }

    const coreTasks = tasks.filter((t: any) => t.type === "core");
    const bonusTasks = tasks.filter((t: any) => t.type === "bonus");
    const orderedTasks = [...coreTasks, ...bonusTasks];

    const toInsert = orderedTasks.map((t: any) => ({
      user_id: userId,
      task_text: String(t.task_text || ""),
      goal_name: String(t.goal_name || "General"),
      completed: false,
      date: today,
    }));

    const { data: inserted } = await supabase.from("daily_tasks").insert(toInsert).select();

    return NextResponse.json({ tasks: inserted, coreCount: coreTasks.length, bonusCount: bonusTasks.length, generated: true });
  } catch (err) {
    console.error("Weekly plan error:", err);
    const message = err instanceof Error ? err.message : "Failed to create plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
