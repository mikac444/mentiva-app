import Anthropic from "@anthropic-ai/sdk";

export type MissionTaskContext = {
  northStar: string;
  enfoques: { name: string; id: string }[];
  recentTasks: { task_text: string; task_type: string; completed: boolean; date: string }[];
  userName: string;
  lang: string;
  currentStreak: number;
  goalSteps?: { goal: string; steps: string[]; emotionalWhy?: string }[];
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

  // Enfoques for secondary + micro missions (North Star drives the non-negotiable)
  const enf0 = ctx.enfoques[0]?.name || "General";
  const enf1 = ctx.enfoques[1]?.name || (ctx.enfoques[0]?.name || "General");

  // Build goal steps context from vision board analysis
  const goalStepsBlock = (ctx.goalSteps && ctx.goalSteps.length > 0)
    ? ctx.goalSteps.map(g => {
        let block = `- ${g.goal}`;
        if (g.steps.length > 0) block += `\n  Next steps: ${g.steps.join("; ")}`;
        if (g.emotionalWhy) block += `\n  Why it matters: ${g.emotionalWhy}`;
        return block;
      }).join("\n")
    : "";

  const prompt = `You are Menti, an AI life mentor. CRITICAL: ALL output must be in ${langName} — every task_text, enfoque_name, and motivational_pulse must be in ${langName}, no exceptions.

NORTH STAR (the user's #1 overarching life goal):
${ctx.northStar}

WEEKLY FOCUSES (enfoques the user chose to work on):
${enfoqueList || "Not set yet — use the North Star to guide tasks."}
${goalStepsBlock ? `
VISION BOARD GOALS & NEXT STEPS (from the user's vision board — use these to make missions specific and relevant):
${goalStepsBlock}
` : ""}
TODAY: ${dayOfWeek} ${isWeekend ? "(WEEKEND — lighter, more personal tasks)" : ""}
CURRENT STREAK: ${ctx.currentStreak} consecutive days${ctx.currentStreak >= 7 ? " — impressive! Acknowledge this." : ""}
${nnSkippedYesterday ? "NOTE: Yesterday's non-negotiable was SKIPPED. Make today's slightly easier to rebuild momentum." : ""}

RECENTLY COMPLETED (last 7 days):
${completedRecently.length > 0 ? completedRecently.slice(0, 10).map(t => `[DONE] ${t.task_text}`).join("\n") : "None yet — this might be their first day."}

RECENTLY SKIPPED (last 7 days):
${skippedRecently.length > 0 ? skippedRecently.slice(0, 5).map(t => `[SKIPPED] ${t.task_text}`).join("\n") : "None."}

GENERATE EXACTLY 3 MISSIONS:

1. NON-NEGOTIABLE (task_type: "non_negotiable")
   - enfoque_name: "${ctx.northStar}"
   - This task MUST directly advance the NORTH STAR: "${ctx.northStar}"
   - The single most important action today for their #1 goal
   - If they do NOTHING else today, this is the one
   - estimated_minutes: 15-30${isWeekend ? " (or lighter, 10-15 min)" : ""}

2. SECONDARY (task_type: "secondary")
   - enfoque_name: MUST be "${enf0}"
   - A task for this weekly focus area
   - estimated_minutes: 10-20
   - Should feel productive but not overwhelming

3. MICRO WIN (task_type: "micro")
   - enfoque_name: MUST be "${enf1}"
   - Quick task for this weekly focus area, UNDER 5 minutes
   - Builds momentum, easy dopamine hit

Also generate a MOTIVATIONAL PULSE — a 1-2 sentence message from Menti for the bottom of the Today page. Make it warm, specific to their North Star or current streak. Not generic motivational quotes — reference THEIR goals.

RULES:
- Each task MUST include estimated_minutes (integer)
- Each task MUST include enfoque_name as specified above
- When vision board goals have specific next steps listed above, use those steps to inform your task suggestions — they reflect what the user actually wants to work on
- Prioritize steps the user HASN'T done recently (check the completed/skipped lists above)
- Be clear about WHAT to do, but NOT how or for how long — let the user decide the specifics
  GOOD: "Practice sign language"
  BAD: "Watch a 20-minute beginner sign language video on YouTube"
  GOOD: "Go for a run with your dog"
  BAD: "Take your dog for a 20-minute walk then do a 5-minute jog around the block"
- Use the user's OWN WORDS from their enfoque names when possible
- Do NOT assume specific apps, tools, methods, locations, or durations
- If they skipped a similar task before, make it SMALLER or different
- ALL text in ${langName}
- NO emojis in task text or pulse

Respond ONLY with valid JSON, no other text:
{
  "missions": [
    {"task_text": "...", "task_type": "non_negotiable", "enfoque_name": "${ctx.northStar}", "estimated_minutes": 25},
    {"task_text": "...", "task_type": "secondary", "enfoque_name": "${enf0}", "estimated_minutes": 15},
    {"task_text": "...", "task_type": "micro", "enfoque_name": "${enf1}", "estimated_minutes": 5}
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
    // Fallback enfoque mapping: non_negotiable=North Star, secondary=enf[0], micro=enf[1]
    const fallbackEnfoque = (taskType: string, index: number) => {
      if (taskType === "non_negotiable") return ctx.northStar;
      if (taskType === "secondary") return ctx.enfoques[0]?.name || "General";
      if (taskType === "micro") return ctx.enfoques[1]?.name || ctx.enfoques[0]?.name || "General";
      return ctx.enfoques[index % ctx.enfoques.length]?.name || "General";
    };
    const missions: GeneratedMission[] = result.missions
      .filter((m: Record<string, unknown>) => m.task_text && validTypes.includes(m.task_type as string))
      .map((m: Record<string, unknown>, i: number) => ({
        task_text: String(m.task_text),
        task_type: m.task_type as "non_negotiable" | "secondary" | "micro",
        enfoque_name: String(m.enfoque_name || fallbackEnfoque(String(m.task_type), i)),
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
