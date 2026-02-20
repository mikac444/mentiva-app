import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// --- Prompts ---

const PROFILE_GENERATOR_PROMPT = `You are analyzing a completed onboarding conversation for Mentiva. Based on the conversation data below, generate a structured user profile.

COLLECTED DATA FROM CONVERSATION:
{collectedData}

FULL CONVERSATION TRANSCRIPT:
{transcript}

Generate a JSON object with these exact fields. Infer what you can from the conversation. If a field wasn't discussed, use your best judgment based on context clues, or use null for optional fields.

{
  "journey_stage": "exploring" | "crystallizing" | "executing",
  "core_values": ["value1", "value2", ...],
  "motivations": ["motivation1", "motivation2", ...],
  "fears": ["fear1", "fear2", ...],
  "self_narrative": "A 1-2 sentence summary of how they see their own journey",
  "definition_of_success": "What success means to them personally",
  "life_stage": "Brief description of current life context",
  "commitments": ["commitment1", "commitment2", ...],
  "energy_pattern": "morning" | "afternoon" | "evening" | "variable",
  "available_hours_per_day": number or null,
  "preferred_tone": "direct" | "warm" | "playful" | "gentle" | "strategic",
  "processing_style": "visual" | "written" | "structured" | "feeling",
  "accountability_style": "push_me" | "gentle_reminders" | "trust_me" | "check_ins"
}

Return ONLY valid JSON, no other text.`;

const SIP_GENERATOR_PROMPT = `You are generating a System Instruction Profile (SIP) for Mentiva's AI mentor, Menti. This SIP will be prepended to EVERY Claude API call for this specific user, personalizing all of Menti's interactions.

USER PROFILE:
{profile}

USER'S NAME: {userName}

Write a natural-language system prompt that tells Menti everything it needs to know about this person. The SIP should:

1. Start with "You are Menti, a personal AI mentor for {userName}." followed by a brief description of who they are.
2. Include a COMMUNICATION STYLE section with 4-5 bullet points on how to talk to them.
3. Include a VALUES & MOTIVATIONS section with their core drivers and what success means to them.
4. Include a WATCH FOR section with 3-4 things Menti should be aware of (patterns, blind spots, risks).
5. Include a TASK APPROACH section with 4-5 guidelines for how to frame tasks and suggestions.
6. End with a CURRENT FOCUS section placeholder: "[Updated dynamically from vision boards, focus areas, and recent activity]"

The tone of the SIP itself should be instructional and clear — it's instructions for the AI, not a message to the user. But it should convey deep understanding of who this person is.

CRITICAL: NEVER include emojis anywhere in the SIP. Use plain text only.

Return ONLY the SIP text, no JSON wrapping, no markdown code fences.`;

const SUMMARY_CARD_PROMPT = `Based on this user profile, generate a brief, warm summary card that Menti will show the user after onboarding. This is the "Here's what I learned about you" moment.

USER PROFILE:
{profile}

USER'S NAME: {userName}

Generate a JSON object:
{
  "identityStatement": "A one-line statement about who they are (e.g., 'You're a builder who's ready to execute' or 'You're discovering what lights you up')",
  "keyInsights": ["3-4 short bullet points about what Menti learned — values, motivations, style"],
  "mentiApproach": "A 1-2 sentence description of how Menti will show up for them (e.g., 'I'll be direct with you. I'll challenge you when you're coasting.')",
  "closingLine": "A warm, personalized line that transitions to the next step"
}

NEVER use emojis. Use plain text only.
Return ONLY valid JSON.`;

// --- Types ---

type ChatMessage = {
  role: string;
  content: string;
};

type SummaryCard = {
  identityStatement: string;
  keyInsights: string[];
  mentiApproach: string;
  closingLine: string;
};

type RequestBody = {
  userId: string;
  userName?: string;
  collectedData: Record<string, unknown>;
  messages?: ChatMessage[];
  lang?: string;
};

// --- Helpers ---

function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Menti"}: ${m.content}`)
    .join("\n");
}

function extractTextFromResponse(
  response: Anthropic.Messages.Message
): string {
  const block = response.content[0];
  if (block.type === "text") return block.text;
  return "";
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return fallback;
  }
}

function buildProfilePrompt(
  collectedData: Record<string, unknown>,
  transcript: string
): string {
  return PROFILE_GENERATOR_PROMPT
    .replace("{collectedData}", JSON.stringify(collectedData, null, 2))
    .replace("{transcript}", transcript);
}

function buildSIPPrompt(
  profile: Record<string, unknown>,
  userName: string
): string {
  return SIP_GENERATOR_PROMPT
    .replace("{profile}", JSON.stringify(profile, null, 2))
    .replaceAll("{userName}", userName);
}

function buildSummaryPrompt(
  profile: Record<string, unknown>,
  userName: string
): string {
  return SUMMARY_CARD_PROMPT
    .replace("{profile}", JSON.stringify(profile, null, 2))
    .replaceAll("{userName}", userName);
}

function buildDefaultSummaryCard(userName: string): SummaryCard {
  return {
    identityStatement: `Welcome, ${userName}`,
    keyInsights: ["Menti is getting to know you"],
    mentiApproach: "I'm here to help you on your journey.",
    closingLine: "Let's get started with your vision.",
  };
}

function buildProfileRow(
  userId: string,
  profile: Record<string, unknown>,
  messages: ChatMessage[]
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    journey_stage: profile.journey_stage || "exploring",
    core_values: profile.core_values || [],
    motivations: profile.motivations || [],
    fears: profile.fears || [],
    self_narrative: profile.self_narrative || null,
    definition_of_success: profile.definition_of_success || null,
    life_stage: profile.life_stage || null,
    commitments: profile.commitments || [],
    energy_pattern: profile.energy_pattern || "variable",
    available_hours_per_day: profile.available_hours_per_day || null,
    preferred_tone: profile.preferred_tone || "warm",
    processing_style: profile.processing_style || "written",
    accountability_style: profile.accountability_style || "gentle_reminders",
    onboarding_conversation: messages,
    onboarding_completed_at: now,
    updated_at: now,
  };
}

// --- Route handler ---

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId, userName, collectedData, messages, lang } =
      (await request.json()) as RequestBody;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const supabase = await createClient();
    const name = userName || "friend";
    const chatMessages = messages || [];
    const transcript = buildTranscript(chatMessages);

    // Step 1: Generate structured profile from conversation
    const profileResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: buildProfilePrompt(collectedData, transcript) }],
    });

    const profile = parseJSON<Record<string, unknown>>(
      extractTextFromResponse(profileResponse),
      collectedData
    );

    // Step 2: Generate SIP from profile
    const sipResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildSIPPrompt(profile, name) }],
    });

    const sipText = extractTextFromResponse(sipResponse);

    // Step 3: Generate summary card
    const summaryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      messages: [{ role: "user", content: buildSummaryPrompt(profile, name) }],
    });

    const summaryCard = parseJSON<SummaryCard>(
      extractTextFromResponse(summaryResponse),
      buildDefaultSummaryCard(name)
    );

    // Step 4: Save profile to database
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(buildProfileRow(userId, profile, chatMessages), {
        onConflict: "user_id",
      });

    if (profileError) {
      console.error("Profile save error:", profileError);
    }

    // Step 5: Deactivate old SIPs, then insert the new one
    await supabase
      .from("system_instruction_profiles")
      .update({ is_active: false })
      .eq("user_id", userId);

    const { error: sipError } = await supabase
      .from("system_instruction_profiles")
      .insert({
        user_id: userId,
        version: 1,
        prompt_text: sipText,
        generated_from: profile,
        is_active: true,
      });

    if (sipError) {
      console.error("SIP save error:", sipError);
    }

    return NextResponse.json({
      profile,
      summaryCard,
      sipGenerated: !sipError,
    });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
