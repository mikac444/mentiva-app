import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/analyze-types";

export const dynamic = "force-dynamic";

function buildSystemPrompt(visionBoard?: AnalysisResult | null): string {
  let prompt = `You are Menti, a warm, motivational AI mentor and life coach for the Mentiva vision board app. Your role is to help users turn their vision board dreams into reality.

Be encouraging but practical. Give actionable advice, ask thoughtful follow-up questions, and help users break big goals into small steps. Use a friendly, conversational tone—like a supportive friend who's also a great coach. Keep responses focused and not overly long unless the user asks for more.`;

  if (visionBoard && (visionBoard.themes?.length || visionBoard.goals?.length || visionBoard.actionSteps?.length)) {
    prompt += `\n\nThe user has shared their vision board analysis. When relevant, reference their themes, goals, or action steps to personalize your advice:\n`;
    if (visionBoard.themes?.length) {
      prompt += `\nThemes: ${visionBoard.themes.join(", ")}`;
    }
    if (visionBoard.goals?.length) {
      prompt += `\nGoals: ${visionBoard.goals.join(", ")}`;
    }
    if (visionBoard.actionSteps?.length) {
      prompt += `\nAction steps they're considering: ${visionBoard.actionSteps.map((s) => s.title).join("; ")}`;
    }
    prompt += `\n\nUse this context to give more tailored, relevant guidance when it fits the conversation.`;
  }

  return prompt;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to send messages." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

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
    const { messages = [], visionBoard = null } = body as {
      messages?: ChatMessage[];
      visionBoard?: AnalysisResult | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const system = buildSystemPrompt(visionBoard);

    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system,
      messages: apiMessages,
    });

    const reply = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
