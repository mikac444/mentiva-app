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
- KNOW YOUR ROLE: You are a motivational mentor, not a domain expert. You CAN mention general well-known concepts but NEVER prescribe specific quantities, routines, exercises, diets, investment amounts, or professional-grade advice. Focus on commitment, consistency, and habits. If domain-specific details matter, suggest they consult a professional.

YOUR CAPABILITIES:
- This is a text-only chat. You CANNOT receive or view images, screenshots, photos, or files of any kind.
- NEVER ask the user to "show me", "share a screenshot", "send a photo", or upload anything. The chat does not support this.
- Instead, ask users to DESCRIBE what they see, type out numbers, or summarize information in text. For example, instead of "Can you show me your screen time?", say "What do your screen time numbers look like? Which apps are using the most time?"`;

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
          const recentContext = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
          const focusDetector = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{
              role: "user",
              content: `Analyze this message and determine if the user is EXPLICITLY setting goals or declaring priorities they want to actively work on.

ONLY detect focus areas when the user is:
- Directly stating "I want to focus on...", "My goal is...", "I'm working on..."
- Explicitly asking for help with a specific life area AS A GOAL
- Clearly declaring priorities for their personal development

DO NOT detect focus areas from:
- Casual mentions of topics ("I'm engaged" does NOT mean "Relationships" is a focus area)
- Discussing hobbies or interests without goal-setting intent ("I listen to podcasts" is NOT a focus area)
- Answering questions about their life context or current situation
- Mentioning activities without expressing a desire to improve them
- Complaining about something without stating intent to change it

Recent conversation:
${recentContext}

Latest message: "${lastUserMsg.content}"

If the user is EXPLICITLY declaring goals they want to work on, respond with ONLY a JSON array of short labels in the SAME language. Examples: ["Negocio", "Salud"], ["Fitness", "Morning routine"]
Otherwise (the MORE COMMON case — err on the side of returning empty): []

Respond with ONLY the JSON array, nothing else.`
            }],
          });
          const focusText = focusDetector.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map(b => b.text).join("").trim();
          const parsed = JSON.parse(focusText.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Additive save: only insert focus areas that don't already exist.
            // The weekly planner is the authoritative source for full replacement.
            // Chat detection should only ADD areas, never remove existing ones.
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: existingAreas } = await supabase
              .from("user_focus_areas")
              .select("area")
              .eq("user_id", userId);
            const existingSet = new Set((existingAreas ?? []).map(f => f.area.toLowerCase()));
            const newAreas = parsed.filter((a: string) => !existingSet.has(String(a).toLowerCase()));
            if (newAreas.length > 0) {
              await supabase.from("user_focus_areas").insert(
                newAreas.map((a: string) => ({ user_id: userId, area: String(a) }))
              );
              console.log("Focus areas added:", newAreas);
            }
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
