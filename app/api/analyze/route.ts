import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/analyze-types";

const ANALYSIS_PROMPT = `You are Menti, Mentiva's AI mentor. You are analyzing a vision board image. Look at the images, words, colors, and layout. Do not identify yourself as Claude or any other name—only as Menti.

Return ONLY raw JSON. Do not wrap the response in markdown code fences (no \`\`\`json or \`\`\`). Output nothing but the JSON object itself. Use this exact structure:
{
  "summary": "A warm, personal 2-sentence message about what you see in this vision board. Write as Menti speaking directly to the user. Be specific about what you see, not generic. Example: Your vision board tells a powerful story of someone ready to build something meaningful — from launching a business to investing in personal wellness.",
  "themes": ["theme1", "theme2", "theme3"],
  "goals": ["goal1", "goal2", "goal3"],
  "pans": ["pattern1", "pattern2"],
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
      "steps": [
        "Specific actionable step 1",
        "Specific actionable step 2",
        "Specific actionable step 3"
      ]
    }
  ],
  "insight": "A 2-3 sentence insight connecting the goals together. Point out how they relate to each other and suggest which goal to start with and why. Be specific and encouraging."
}

Rules:
- Identify 2-4 overarching themes (e.g. "Travel", "Health", "Creativity")
- Create 3-6 goals, each with 2-3 specific actionable steps in goalsWithSteps
- Note 1-3 patterns (recurring symbols, colors, or ideas)
- Also keep the flat actionSteps array with exactly 5 steps for backwards compatibility
- The summary should feel like a real mentor speaking — warm, specific, encouraging
- The insight should connect dots between goals and suggest a starting point
- Be concrete and specific, not generic. Reference what you actually see in the image.`;

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
    const { image, mediaType = "image/png" } = body as {
      image?: string;
      mediaType?: string;
    };

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid image (expected base64 string)" },
        { status: 400 }
      );
    }

  const type = MEDIA_TYPES.includes(mediaType as (typeof MEDIA_TYPES)[number])
      ? (mediaType as (typeof MEDIA_TYPES)[number])
      : "image/png";

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
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
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text =
      textBlock && "text" in textBlock ? textBlock.text : "";

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
      !Array.isArray(parsed.themes) ||
      !Array.isArray(parsed.goals) ||
      !Array.isArray(parsed.actionSteps)
    ) {
      return NextResponse.json(
        { error: "Invalid analysis structure from model" },
        { status: 500 }
      );
    }

    // Ensure backwards compatibility
    if (!parsed.goalsWithSteps) {
      parsed.goalsWithSteps = parsed.goals.map((g) => ({ goal: g, steps: [] }));
    }
    if (!parsed.summary) {
      parsed.summary = "Your vision board reveals inspiring goals. Let me break them down for you.";
    }
    if (!parsed.insight) {
      parsed.insight = "Your goals are interconnected — progress in one area will fuel the others.";
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
