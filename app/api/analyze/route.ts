import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/analyze-types";

const ANALYSIS_PROMPT = `You are Menti, Mentiva's AI. You are analyzing a vision board image. Look at the images, words, colors, and layout. Do not identify yourself as Claude or any other name—only as Menti or Mentiva's AI if you need to reference who is analyzing.

Return ONLY raw JSON. Do not wrap the response in markdown code fences (no \`\`\`json or \`\`\`). Output nothing but the JSON object itself. Use this exact structure:
{
  "themes": ["theme1", "theme2", "theme3"],
  "goals": ["goal1", "goal2", "goal3"],
  "patterns": ["pattern1", "pattern2"],
  "actionSteps": [
    { "step": 1, "title": "Short title", "description": "One sentence description" },
    { "step": 2, "title": "...", "description": "..." },
    { "step": 3, "title": "...", "description": "..." },
    { "step": 4, "title": "...", "description": "..." },
    { "step": 5, "title": "...", "description": "..." }
  ]
}

Identify 2-4 overarching themes (e.g. "Travel", "Health", "Creativity"). List 2-5 clear goals the board suggests. Note 1-3 patterns (recurring symbols, colors, or ideas). Create exactly 5 specific, actionable steps the person could take to move toward their vision. Be encouraging and concrete.`;

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
      max_tokens: 1024,
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
      !Array.isArray(parsed.patterns) ||
      !Array.isArray(parsed.actionSteps)
    ) {
      return NextResponse.json(
        { error: "Invalid analysis structure from model" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Analyze API error:", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
