import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "./analyze-types";

export type TaskGenerationContext = {
  visionBoards: AnalysisResult[];
  focusAreas: string[];
  recentTasks: { task_text: string; goal_name: string; completed: boolean; date: string }[];
  userName: string;
  lang: string;
};

export async function generateDailyTasks(ctx: TaskGenerationContext, sipText?: string | null): Promise<{ task_text: string; goal_name: string; priority: string }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  // Build context about what the user has been doing
  const completedRecently = ctx.recentTasks.filter(t => t.completed);
  const skippedRecently = ctx.recentTasks.filter(t => !t.completed);

  // Find patterns - tasks skipped multiple times
  const skipCounts: Record<string, number> = {};
  for (const t of skippedRecently) {
    const key = t.task_text.toLowerCase().trim();
    skipCounts[key] = (skipCounts[key] || 0) + 1;
  }
  const frequentlySkipped = Object.entries(skipCounts)
    .filter(([_, count]) => count >= 2)
    .map(([task]) => task);

  // Gather all goals from vision boards
  const allGoals = ctx.visionBoards.flatMap(vb => 
    vb.goalsWithSteps?.map(g => `${g.goal}: ${g.steps.join(", ")}`) ?? 
    vb.goals?.map(g => g) ?? []
  );

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const prompt = `You are Menti, an AI life mentor. Generate exactly 3-5 daily tasks for ${ctx.userName} for today (${dayOfWeek}).

USER'S VISION BOARD GOALS:
${allGoals.length > 0 ? allGoals.join("\n") : "No vision board uploaded yet."}

USER'S CURRENT FOCUS AREAS:
${ctx.focusAreas.length > 0 ? ctx.focusAreas.join(", ") : "No specific focus areas set yet. Use vision board goals."}

RECENTLY COMPLETED (last 7 days):
${completedRecently.length > 0 ? completedRecently.map(t => `✅ ${t.task_text} (${t.goal_name})`).join("\n") : "None yet - this might be their first day."}

RECENTLY SKIPPED/NOT COMPLETED (last 7 days):
${skippedRecently.length > 0 ? skippedRecently.map(t => `❌ ${t.task_text} (${t.goal_name})`).join("\n") : "None."}

FREQUENTLY SKIPPED TASKS (skipped 2+ times):
${frequentlySkipped.length > 0 ? frequentlySkipped.join(", ") : "None."}

RULES:
1. Generate 3-5 tasks. On weekends (${isWeekend ? "TODAY IS A WEEKEND" : "today is a weekday"}), lean toward 3 lighter tasks.
2. Each task must be specific and completable today (not "work on business" but "spend 20 min researching LLC requirements").
3. If a task has been skipped 2+ times, make it SMALLER and EASIER. Example: "30 min exercise" → "10 min walk outside".
4. Mix tasks from different life areas for balance, but prioritize the user's focus areas.
5. Include at least one quick win (something that takes under 5 minutes) to build momentum.
6. Don't repeat the exact same tam yesterday if it was completed — move to the next step.
7. Each task needs a goal_name (the life area it belongs to) and priority (high/medium/low).
8. Language: respond in ${ctx.lang === "es" ? "Spanish" : "English"}.

CRITICAL: The goal_name must be a SHORT label (1-3 words max) in ${ctx.lang === "es" ? "SPANISH" : "ENGLISH"}. Translate if needed. Examples: "Negocio", "Salud", "Rutina matutina", "Finanzas", "Relaciones".

Respond ONLY with valid JSON array, no other text:
[{"task_text": "...", "goal_name": "...", "priority": "high|medium|low"}]`;

  const systemPrompt = sipText ? `${sipText}\n\n---\n\nTASK GENERATION INSTRUCTIONS:\n${prompt}` : prompt;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: "Generate my daily tasks for today based on the instructions." }],
  });

  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map(b => b.text)
    .join("");

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const tasks = JSON.parse(cleaned);
    if (!Array.isArray(tasks)) throw new Error("Not an array");
    return tasks.map((t: any) => ({
      task_text: String(t.task_text || ""),
      goal_name: String(t.goal_name || "General"),
      priority: ["high", "mium", "low"].includes(t.priority) ? t.priority : "medium",
    })).filter((t: any) => t.task_text.length > 0);
  } catch (e) {
    console.error("Failed to parse task generation response:", text);
    throw new Error("Failed to generate tasks");
  }
}
