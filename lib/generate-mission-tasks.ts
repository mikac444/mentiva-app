import Anthropic from "@anthropic-ai/sdk";

export type MissionTaskContext = {
  northStar: string;
  enfoques: { name: string; id: string }[];
  recentTasks: { task_text: string; task_type: string; completed: boolean; date: string }[];
  userName: string;
  lang: string;
  currentStreak: number;
};

export type GeneratedMission = {
  task_text: string;
  task_type: "non_negotiable" | "secondary" | "micro";
  enfoque_name: string;
  estimated_minutes: number;
};

export type MissionGenerationResult = {
  missions: GeneratedMission[];
  motivational_pulse: string;
};

export async function generateMissionTasks(
  ctx: MissionTaskContext,
  sipText?: string | null
): Promise<MissionGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  const completedRecently = ctx.recentTasks.filter(t => t.completed);
  const skippedRecently = ctx.recentTasks.filter(t => !t.completed);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdayNN = ctx.recentTasks.find(
    t => t.date === yesterdayStr && t.task_type === "non_negotiable"
  );
  const nnSkippedYesterday = yesterdayNN && !yesterdayNN.completed;

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const langName = ctx.lang === "es" ? "SPANISH" : "ENGLISH";
  const enfoqueList = ctx.enfoques.map(e => e.name).join(", ");

  const prompt = `You are Menti, an AI life mentor. CRITICAL: ALL output must be in ${langName} — every task_text, enfoque_name, and motivational_pulse must be in ${langName}, no exceptions.

NORTH STAR (the user's overarching life goal):
${ctx.northStar}

WEEKLY FOCUSES (enfoques):
${enfoqueList || "Not set yet — use the North Star to guide tasks."}

TODAY: ${dayOfWeek} ${isWeekend ? "(WEEKEND — lighter, more personal tasks)" : ""}
CURRENT STREAK: ${ctx.currentStreak} consecutive days${ctx.currentStreak >= 7 ? " — impressive! Acknowledge this." : ""}
${nnSkippedYesterday ? "NOTE: Yesterday's non-negotiable was SKIPPED. Make today's slightly easier to rebuild momentum." : ""}

RECENTLY COMPLETED (last 7 days):
${completedRecently.length > 0 ? completedRecently.slice(0, 10).map(t => `[DONE] ${t.task_text}`).join("\n") : "None yet — this might be their first day."}

RECENTLY SKIPPED (last 7 days):
${skippedRecently.length > 0 ? skippedRecently.slice(0, 5).map(t => `[SKIPPED] ${t.task_text}`).join("\n") : "None."}

GENERATE EXACTLY 3 MISSIONS:

1. NON-NEGOTIABLE (task_type: "non_negotiable")
   - The MOST important task advancing their North Star
   - 15-30 minutes${isWeekend ? " (or lighter, 10-15 min)" : ""}
   - Must feel meaningful and achievable
   - If they do NOTHING else today, this is the one
   - Connect it to one of their enfoques

2. SECONDARY (task_type: "secondary")
   - Supporting task for a DIFFERENT enfoque than the non-negotiable
   - 10-20 minutes
   - Should feel productive but not overwhelming

3. MICRO WIN (task_type: "micro")
   - Quick task, UNDER 5 minutes
   - Builds momentum, easy dopamine hit
   - Can be any enfoque
   - Examples: "Send that one message", "Do 10 pushups", "Write 3 gratitude items"

Also generate a MOTIVATIONAL PULSE — a 1-2 sentence message from Menti for the bottom of the Today page. Make it warm, specific to their North Star or current streak. Not generic motivational quotes — reference THEIR goals.

RULES:
- Each task MUST include estimated_minutes (integer)
- Each task MUST include enfoque_name (which focus area it serves — use their enfoque names, 1-3 words)
- Spread tasks across different enfoques when possible
- If they skipped a similar task before, make it SMALLER
- Be specific: not "work on business" but "spend 20 min outlining 3 product features"
- ALL text in ${langName}
- NO emojis in task text or pulse

Respond ONLY with valid JSON, no other text:
{
  "missions": [
    {"task_text": "...", "task_type": "non_negotiable", "enfoque_name": "...", "estimated_minutes": 25},
    {"task_text": "...", "task_type": "secondary", "enfoque_name": "...", "estimated_minutes": 15},
    {"task_text": "...", "task_type": "micro", "enfoque_name": "...", "estimated_minutes": 5}
  ],
  "motivational_pulse": "..."
}`;

  const systemPrompt = sipText
    ? `${sipText}\n\n---\n\nMISSION GENERATION INSTRUCTIONS:\n${prompt}`
    : prompt;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: "Generate my 3 daily missions based on the instructions above." }],
  });

  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map(b => b.text)
    .join("");

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    if (!result.missions || !Array.isArray(result.missions)) {
      throw new Error("Missing missions array");
    }

    const validTypes = ["non_negotiable", "secondary", "micro"];
    const missions: GeneratedMission[] = result.missions
      .filter((m: Record<string, unknown>) => m.task_text && validTypes.includes(m.task_type as string))
      .map((m: Record<string, unknown>) => ({
        task_text: String(m.task_text),
        task_type: m.task_type as "non_negotiable" | "secondary" | "micro",
        enfoque_name: String(m.enfoque_name || ctx.enfoques[0]?.name || "General"),
        estimated_minutes: Math.max(1, Math.min(60, Number(m.estimated_minutes) || 15)),
      }));

    const sortOrder = ["non_negotiable", "secondary", "micro"];
    missions.sort((a, b) => sortOrder.indexOf(a.task_type) - sortOrder.indexOf(b.task_type));

    return {
      missions: missions.slice(0, 3),
      motivational_pulse: String(result.motivational_pulse || ""),
    };
  } catch (e) {
    console.error("Failed to parse mission generation response:", text);
    throw new Error("Failed to generate missions");
  }
}
