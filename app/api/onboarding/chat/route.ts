import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const META_PROMPT = `You are conducting an onboarding conversation for Mentiva, a vision board app with an AI mentor called Menti. Your job is to get to know this person through a warm, natural conversation — NOT a form or survey.

WHAT YOU KNOW SO FAR:
{collectedData}

WHAT YOU STILL NEED TO LEARN:
{remainingFields}

CONVERSATION HISTORY:
{conversationHistory}

RULES:
1. Ask ONE question at a time. Never ask multiple questions in one message.
2. Be warm, curious, and conversational — like meeting someone interesting at a coffee shop.
3. Adapt your energy and language to match theirs. If they're casual, be casual. If they're thoughtful, be thoughtful.
4. Use their name naturally once you know it.
5. Generate 3-4 suggested responses the user can tap (short, natural options) PLUS they can always type freely.
6. Don't be formulaic. If something interesting comes up, follow that thread before moving to the next topic.
7. Never mention "onboarding" or "profile" or "data" — this is a conversation, not data collection.
8. When you have enough information on all required fields, set "readyToComplete" to true in your response.
9. NEVER use emojis in your messages. Use plain text only.
10. Vary your opening phrases. Don't start multiple messages with the same phrase like "Here's what I'm curious about" -- use it once at most, then find other natural ways to transition.
11. When generating suggestedResponses, NEVER include options like "All of the above", "All three", or any option that references other options by position. Instead, if you want to offer a combined option, name the specific themes (e.g., instead of "All three options above", write "Proving myself, helping people, and freedom -- all of it"). Each suggested response must be self-contained and meaningful on its own.
12. Your response MUST be valid JSON with this structure:
{
  "message": "Your conversational message to the user",
  "suggestedResponses": ["Option 1", "Option 2", "Option 3"],
  "collectedData": { updated collected data object },
  "readyToComplete": false
}

REQUIRED FIELDS TO COLLECT:
- journey_stage: Are they exploring (don't have a clear vision), crystallizing (have a sense but not committed), or executing (clear vision, need help acting on it)?
- core_values: 2-4 values that drive them (impact, freedom, security, connection, creativity, growth, independence, legacy, fun, peace, etc.)
- motivations: What specifically drives them forward? What do they want?
- life_context: Brief understanding of their life — age/stage, what they do, responsibilities
- commitments: Major things filling their plate (job, school, business, family, etc.)
- energy_pattern: When do they have the most energy? (morning, afternoon, evening, variable)
- preferred_tone: How do they want Menti to communicate? (direct, warm, playful, gentle, strategic)
- accountability_style: How do they respond to accountability? (push_me, gentle_reminders, trust_me, check_ins)
- goal_relationship: Have they tried goal-setting before? What usually happens? Do they start strong and fade, never start, follow through?

OPTIONAL BUT VALUABLE:
- fears: What blocks them or holds them back (failure, judgment, overwhelm, commitment, etc.)
- self_narrative: How they describe their own journey
- definition_of_success: What success means to them personally
- available_hours: Roughly how much free time they have per day

DO NOT collect all of these mechanically. Weave them into natural conversation. Some will emerge without asking directly. It's OK to not get every optional field.

{depthRules}`;

const REQUIRED_FIELDS_DEEP = [
  "journey_stage",
  "core_values",
  "motivations",
  "life_context",
  "commitments",
  "energy_pattern",
  "preferred_tone",
  "accountability_style",
  "goal_relationship",
];

const REQUIRED_FIELDS_QUICK = [
  "journey_stage",
  "core_values",
  "motivations",
  "preferred_tone",
  "accountability_style",
];

const DEEP_RULES = `DEPTH MODE: DEEP CONVERSATION
- This is a deep conversation. Take your time, follow threads that reveal who they are.
- Ask 8-12 questions total. Go deeper on what matters to them. Extract multiple fields from rich answers.
- 10-15 min is the target. Don't rush, but don't meander either. Every question should have purpose.
- Extract MULTIPLE fields from each rich answer. If someone describes their life situation, capture life_context, commitments, and energy_pattern together.`;

const QUICK_RULES = `DEPTH MODE: QUICK INTRO
- This is a quick intro. Be warm but efficient.
- Ask 4-6 questions maximum. Collect multiple fields per response when possible.
- If their answer reveals values AND motivations, capture both without asking again.
- 3-5 min is the target. Get enough to start personalizing, then let them explore.`;

function buildConversationHistory(
  messages: { role: string; content: string }[],
  windowSize: number = 10
): string {
  if (!messages || messages.length === 0) {
    return "(This is the first message. Open warmly.)";
  }

  // If conversation fits in window, send everything
  if (messages.length <= windowSize) {
    return messages
      .map((m) => `${m.role === "user" ? "User" : "Menti"}: ${m.content}`)
      .join("\n");
  }

  // Sliding window: truncate older messages, keep recent ones in full
  const older = messages.slice(0, messages.length - windowSize);
  const recent = messages.slice(messages.length - windowSize);

  const olderSummary = older
    .map((m) => {
      const speaker = m.role === "user" ? "User" : "Menti";
      const truncated = m.content.length > 80
        ? m.content.substring(0, 80) + "..."
        : m.content;
      return `${speaker}: ${truncated}`;
    })
    .join("\n");

  const recentFull = recent
    .map((m) => `${m.role === "user" ? "User" : "Menti"}: ${m.content}`)
    .join("\n");

  return `[EARLIER IN CONVERSATION - summarized]\n${olderSummary}\n\n[RECENT MESSAGES - full detail]\n${recentFull}`;
}

function getRemainingFields(
  collected: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  return requiredFields.filter(
    (f) =>
      !collected[f] ||
      (Array.isArray(collected[f]) &&
        (collected[f] as unknown[]).length === 0)
  );
}

function buildFilledPrompt(
  collected: Record<string, unknown>,
  remaining: string[],
  historyStr: string,
  depthRules: string
): string {
  return META_PROMPT.replace(
    "{collectedData}",
    JSON.stringify(collected, null, 2)
  )
    .replace(
      "{remainingFields}",
      remaining.length > 0
        ? remaining.join(", ")
        : "ALL REQUIRED FIELDS COLLECTED — you can set readyToComplete to true after a natural closing message."
    )
    .replace("{conversationHistory}", historyStr)
    .replace("{depthRules}", depthRules);
}

function parseAIResponse(
  text: string,
  fallbackData: Record<string, unknown>
): {
  message: string;
  suggestedResponses: string[];
  collectedData: Record<string, unknown>;
  readyToComplete: boolean;
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // Filter out ambiguous "all of the above" type suggested responses
    const ambiguousPattern = /\b(all (of )?(the|three|four|those)( options)?( above)?|all of them|every one of (those|them))\b/i;
    parsed.suggestedResponses = (parsed.suggestedResponses || []).filter(
      (s: string) => !ambiguousPattern.test(s)
    );

    return parsed;
  } catch {
    return {
      message: text,
      suggestedResponses: [],
      collectedData: fallbackData,
      readyToComplete: false,
    };
  }
}

export async function POST(request: Request) {
  try {
    const { messages, collectedData, userName, depth: rawDepth, lang, messageCount: rawCount } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const depthMode = rawDepth === "quick" ? "quick" : "deep";
    const requiredFields = depthMode === "quick" ? REQUIRED_FIELDS_QUICK : REQUIRED_FIELDS_DEEP;
    const langLabel = lang === "es" ? "Spanish" : "English";
    const langRule = `\nLANGUAGE: Conduct this ENTIRE conversation in ${langLabel}. All messages AND suggestedResponses must be in ${langLabel}.`;

    // Escalating urgency based on message count
    const count = rawCount || 0;
    const softCap = depthMode === "quick" ? 5 : 10;
    const hardCap = depthMode === "quick" ? 8 : 16;
    const maxQ = depthMode === "quick" ? 6 : 12;

    let urgencyRule = "";
    if (count >= hardCap) {
      urgencyRule = `\n\nCRITICAL: You MUST set readyToComplete to true NOW. This is message ${count}. Wrap up immediately with a warm closing. Fill in any remaining fields with your best guesses from the conversation context.`;
    } else if (count >= softCap) {
      urgencyRule = `\n\nIMPORTANT: You are at message ${count} of ~${maxQ}. You MUST wrap up in the next 1-2 messages. Prioritize the most important remaining fields and set readyToComplete to true soon.`;
    } else if (count >= Math.floor(softCap * 0.7)) {
      urgencyRule = `\n\nNote: You are at message ${count} of ~${maxQ}. Start planning to wrap up. Try to cover remaining fields efficiently.`;
    }

    const depthRules = (depthMode === "quick" ? QUICK_RULES : DEEP_RULES) + langRule + urgencyRule;

    const collected = collectedData || {};
    const remaining = getRemainingFields(collected, requiredFields);
    const windowSize = depthMode === "quick" ? 8 : 10;
    const historyStr = buildConversationHistory(messages, windowSize);
    const filledPrompt = buildFilledPrompt(collected, remaining, historyStr, depthRules);

    const userContent =
      messages && messages.length > 0
        ? messages[messages.length - 1].content
        : `My name is ${userName || "friend"}. This is the start of our conversation.`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: filledPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseAIResponse(text, collected);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Onboarding chat error:", error);
    return NextResponse.json(
      { error: "Failed to process onboarding chat" },
      { status: 500 }
    );
  }
}
