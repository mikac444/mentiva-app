import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/lib/analyze-types";
import { getActiveSIP } from "@/lib/sip";

export const dynamic = "force-dynamic";

function buildSystemPrompt(visionBoard?: AnalysisResult | null, focusAreas?: string[], recentTasks?: { task_text: string; completed: boolean; date: string }[]): string {
  let prompt = `You are Menti, a warm, motivational AI mentor and life coach for the Mentiva vision board app. Your role is to help users turn their vision board dreams into reality.

Be encouraging but practical. Give actionable advice, ask thoughtful follow-up questions, and help users break big goals into small steps. Use a friendly, conversational tone—like a supportive friend who's also a great coach. Keep responses focused and not overly long unless the user asks for more.

FORMATTING RULES:
- NEVER use markdown formatting. No **bold**, no *italics*, no ## headers, no bullet points with -, no numbered lists with 1., no \`code\`, no --- dividers.
- Write in plain conversational text only. Use line breaks to separate thoughts.
- If you want to emphasize something, use CAPS sparingly or rephrase to make the point stand out naturally.
- If you want to list things, write them as short sentences or separate them with line breaks — not as formatted lists.
- NEVER use emojis.
- KNOW YOUR ROLE: You are a motivational mentor, not a domain expert. You CAN mention general well-known concepts but NEVER prescribe specific quantities, routines, exercises, diets, investment amounts, or professional-grade advice. Focus on commitment, consistency, and habits. If domain-specific details matter, suggest they consult a professional.`;

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
    const { messages = [], visionBoard = null, focusAreas = [], recentTasks = [], userId = null } = body as {
      messages?: ChatMessage[];
      visionBoard?: AnalysisResult | null;
      focusAreas?: string[];
      recentTasks?: { task_text: string; completed: boolean; date: string }[];
      userId?: string | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const sip = userId ? await getActiveSIP(userId) : null;

    const anthropic = new Anthropic({ apiKey });
    const baseSystemPrompt = buildSystemPrompt(visionBoard, focusAreas, recentTasks);
    const system = sip ? `${sip}\n\n---\n\nADDITIONAL CONTEXT:\n${baseSystemPrompt}` : baseSystemPrompt;

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

    // Detect focus areas from the user's latest message
    if (userId && messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg.role === "user") {
        try {
          const focusDetector = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{
              role: "user",
              content: `Analyze this message and determine if the user is expressing priorities, goals, or focus areas for their life.

Message: "${lastUserMsg.content}"

If YES, respond with ONLY a JSON array of short focus area labels in the SAME language as the message. Examples: ["Negocio", "Salud"], ["Business", "Morning routine"], ["Fitness", "Relaciones"]
If NO (just casual chat, questions, etc.), respond with exactly: []

Respond with ONLY the JSON array, nothing else.`
            }],
          });
          const focusText = focusDetector.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map(b => b.text).join("").trim();
          const parsed = JSON.parse(focusText.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Save focus areas
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from("user_focus_areas").delete().eq("user_id", userId);
            await supabase.from("user_focus_areas").insert(
              parsed.map((a: string) => ({ user_id: userId, area: String(a) }))
            );
            console.log("Focus areas saved:", parsed);
          }
        } catch (e) {
          console.error("Focus detection failed:", e);
        }
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
