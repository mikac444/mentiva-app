import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/analyze-types";
import { getActiveSIP } from "@/lib/sip";

const ANALYSIS_PROMPT = `You are Menti, Mentiva's AI mentor. You are analyzing a vision board image. Look at the images, words, colors, and layout. Do not identify yourself as Claude or any other name—only as Menti.

Return ONLY raw JSON. Do not wrap the response in markdown code fences (no \`\`\`json or \`\`\`). Output nothing but the JSON object itself. Use this exact structure:
{
  "summary": "A warm, personal 2-sentence message about what you see in this vision board. Write as Menti speaking directly to the user. Be specific about what you see, not generic.",
  "themes": ["theme1", "theme2", "theme3"],
  "goals": ["goal1", "goal2", "goal3"],
  "patterns": ["pattern1", "pattern2"],
  "actionSteps": [
    { "step": 1, "title": "Short title", "description": "One sentence description" },
    { "step": 2, "title": "...", "description": "..." },
    { "step": 3, "title": "...", "description": "..." },
    { "step": 4, "title": "...", "description": "..." },
    { "step": 5, "title": "...", "description": "..." }
  ],
  "goalsWithSteps": [
    {
      "goal": "Clear goal name (e.g. Launch my business)",
      "area": "business|health|finance|relationships|learning|creative|routine|other",
      "steps": [
        "Specific actionable step 1",
        "Specific actionable step 2",
        "Specific actionable step 3"
      ]
    }
  ],
  "blindSpots": ["1-2 things notably ABSENT from the vision board — health, relationships, finances, rest, fun, etc. Only mention if genuinely missing."],
  "connections": ["1 way the goals connect to each other that the user might not have noticed"],
  "insight": "A 2-3 sentence insight connecting the goals together. Point out how they relate to each other and suggest which goal to start with and why. Be specific and encouraging."
}

Rules:
- Identify 2-4 overarching themes (e.g. "Travel", "Health", "Creativity")
- Create 2-4 goals, each with 2-3 specific actionable steps in goalsWithSteps
- Each goal MUST have an "area" field categorizing it into one of: business, health, finance, relationships, learning, creative, routine, other
- Each goal MUST have an "emotionalWhy" field: a brief sentence about why this goal likely matters to this person based on the overall board context.
- Note 1-3 patterns (recurring symbols, colors, or ideas)
- Also keep the flat actionSteps array with exactly 5 steps for backwards compatibility
- The summary should feel like a real mentor speaking — warm, specific, encouraging
- The insight should connect dots between goals and suggest a starting point
- Be concrete and specific, not generic. Reference what you actually see in the image.
- Detect blind spots: identify 1-2 important life areas that are notably ABSENT from the board
- Find connections: identify 1 way the goals relate to each other that the user might not see
- ALL TEXT must be in LANG_PLACEHOLDER language.
- NEVER use emojis in any output. Use plain text only.
- Be concise. Quality over quantity. Every word should matter.`;

const ENHANCE_PROMPT = `You are Menti, Mentiva's AI mentor. The user uploaded a vision board and you already analyzed it. Now the user has told you about additional goals that were NOT on their board.

Your job: Take the EXISTING goals from the board analysis AND the NEW goals the user just shared, and create a COMPLETE, MERGED list of goals with action steps.

EXISTING GOALS FROM BOARD:
EXISTING_GOALS_PLACEHOLDER

USER'S ADDITIONAL GOALS (in their own words):
ADDITIONAL_GOALS_PLACEHOLDER

Rules:
- Keep ALL existing goals from the board (do not remove any)
- ADD new goals based on what the user shared — interpret their words generously and create clear, actionable goals
- Each goal must have 2-3 specific, actionable steps
- Each goal must have an "area" field: business|health|finance|relationships|learning|creative|routine|other
- Steps should be specific and personal — use the user's own words when possible
- ALL TEXT must be in LANG_PLACEHOLDER language
- Return 4-8 goals total
- Do NOT be generic. Use what the user actually said.

Return ONLY raw JSON, no markdown fences:
{
  "goalsWithSteps": [
    {
      "goal": "Clear goal name",
      "area": "category",
      "steps": ["step1", "step2", "step3"]
    }
  ],
  "summary": "Updated 2-sentence message acknowledging BOTH the board AND the additional goals. Be warm, specific, personal. Speak as Menti.",
  "insight": "2-3 sentence insight connecting ALL goals together — how the board goals and the user's additional goals complement each other. Suggest where to start."
}`;

const MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      image,
      mediaType = "image/png",
      lang = "en",
      enhance,
      existingGoals,
      additionalGoals,
      userId,
    } = body as {
      image?: string;
      mediaType?: string;
      lang?: string;
      enhance?: boolean;
      existingGoals?: string;
      additionalGoals?: string;
      userId?: string;
    };

    const sip = userId ? await getActiveSIP(userId) : null;

    const anthropic = new Anthropic({ apiKey });
    const langLabel = lang === "es" ? "Spanish" : "English";

    // ─── ENHANCE MODE: Merge existing + new goals ───
    if (enhance && existingGoals && additionalGoals) {
      const prompt = ENHANCE_PROMPT
        .replace("EXISTING_GOALS_PLACEHOLDER", existingGoals)
        .replace("ADDITIONAL_GOALS_PLACEHOLDER", additionalGoals)
        .replace("LANG_PLACEHOLDER", langLabel);

      const enhanceSystem = sip ? `${sip}\n\n---\n\nANALYSIS INSTRUCTIONS:\n${prompt}` : prompt;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system: enhanceSystem,
        messages: [{ role: "user", content: "Merge the existing goals with the additional goals as instructed." }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const text = textBlock && "text" in textBlock ? textBlock.text : "";
      if (!text) {
        return NextResponse.json({ error: "No response from AI" }, { status: 500 });
      }

      const raw = text.trim();
      const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsed = JSON.parse(stripped);

      return NextResponse.json(parsed);
    }

    // ─── NORMAL MODE: Analyze image ───
    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid image (expected base64 string)" },
        { status: 400 }
      );
    }

    const type = MEDIA_TYPES.includes(mediaType as (typeof MEDIA_TYPES)[number])
      ? (mediaType as (typeof MEDIA_TYPES)[number])
      : "image/png";

    const prompt = ANALYSIS_PROMPT.replace(/LANG_PLACEHOLDER/g, langLabel);
    const finalSystemPrompt = sip ? `${sip}\n\n---\n\nANALYSIS INSTRUCTIONS:\n${prompt}` : prompt;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: finalSystemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: type,
                data: image.replace(/^data:image\/\w+;base64,/, ""),
              },
            },
            {
              type: "text",
              text: "Analyze this vision board image according to the instructions.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    if (!text) {
      return NextResponse.json(
        { error: "No analysis text in response" },
        { status: 500 }
      );
    }

    const raw = text.trim();
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const parsed = JSON.parse(stripped) as AnalysisResult;

    if (
      !Array.isArray(parsed.themes)
    ) {
      return NextResponse.json(
        { error: "Invalid analysis structure from model" },
        { status: 500 }
      );
    }

    // Ensure backwards compatibility
    if (!parsed.goalsWithSteps && parsed.goals) {
      parsed.goalsWithSteps = parsed.goals.map((g) => ({ goal: g, steps: [] }));
    }
    if (!parsed.goalsWithSteps) {
      parsed.goalsWithSteps = [];
    }
    // Populate goals from goalsWithSteps if missing
    if (!parsed.goals) {
      parsed.goals = parsed.goalsWithSteps.map((g) => g.goal);
    }
    if (!parsed.actionSteps) {
      parsed.actionSteps = [];
    }
    if (!parsed.summary) {
      parsed.summary = lang === "es"
        ? "Tu tablero de visión revela metas inspiradoras. Déjame desglosarlas para ti."
        : "Your vision board reveals inspiring goals. Let me break them down for you.";
    }
    if (!parsed.insight) {
      parsed.insight = lang === "es"
        ? "Tus metas están interconectadas — el progreso en un área impulsará las demás."
        : "Your goals are interconnected — progress in one area will fuel the others.";
    }
    if (!parsed.patterns) {
      parsed.patterns = [];
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Analyze API error:", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
