# Mentiva MVP (Option 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static 3-slide onboarding with a conversational Menti experience, generate a personalized System Instruction Profile (SIP) per user, inject it into all existing API routes, and build a 3-path enhanced vision upload flow.

**Architecture:** The onboarding is a multi-turn chat UI that sends each exchange to a new API route (`/api/onboarding/chat`) which uses Claude to generate adaptive follow-up questions. On completion, `/api/onboarding/complete` generates a structured user profile and a prose SIP, both stored in new Supabase tables. A shared utility (`lib/sip.ts`) fetches the active SIP and is called at the top of every existing API route. The vision upload page forks into 3 paths based on the user's `journey_stage` from their profile.

**Tech Stack:** Next.js 14 (App Router), TypeScript, @anthropic-ai/sdk ^0.32.1, @supabase/ssr, Tailwind CSS with existing sage/gold theme, Claude claude-sonnet-4-5-20250929.

**Reference:** See `docs/plans/2025-02-19-mentiva-vision.md` for full vision document, personas, and SIP examples.

---

## Task 1: Database Schema — New Tables

**Files:**
- Create: `lib/supabase/schema.sql` (reference file, not auto-run)
- Create: `scripts/run-migrations.ts` (optional helper)

**Step 1: Create the schema reference file**

Create `lib/supabase/schema.sql` with the new tables:

```sql
-- User profiles: stores structured data from onboarding conversation
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,

  -- Identity layer
  journey_stage TEXT NOT NULL DEFAULT 'exploring',
  core_values TEXT[] DEFAULT '{}',
  motivations TEXT[] DEFAULT '{}',
  fears TEXT[] DEFAULT '{}',
  self_narrative TEXT,
  definition_of_success TEXT,

  -- Practical layer
  life_stage TEXT,
  commitments TEXT[] DEFAULT '{}',
  energy_pattern TEXT DEFAULT 'variable',
  available_hours_per_day NUMERIC,

  -- Communication layer
  preferred_tone TEXT DEFAULT 'warm',
  processing_style TEXT DEFAULT 'written',
  accountability_style TEXT DEFAULT 'gentle_reminders',

  -- Onboarding data
  onboarding_conversation JSONB DEFAULT '[]',
  onboarding_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- System Instruction Profiles: the generated Claude system prompt per user
CREATE TABLE IF NOT EXISTS system_instruction_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  generated_from JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sip_active
  ON system_instruction_profiles(user_id, is_active)
  WHERE is_active = true;

-- Add vision_type to existing vision_boards table
ALTER TABLE vision_boards ADD COLUMN IF NOT EXISTS vision_type TEXT DEFAULT 'board_upload';
```

**Step 2: Run the migrations in Supabase**

Go to the Supabase dashboard SQL Editor and run the SQL from step 1 manually. Alternatively, use the Supabase CLI:

```bash
# If using Supabase CLI:
npx supabase db push
```

**Step 3: Commit**

```bash
git add lib/supabase/schema.sql
git commit -m "feat: add schema for user_profiles and system_instruction_profiles tables"
```

---

## Task 2: SIP Utility — Fetch Active SIP

**Files:**
- Create: `lib/sip.ts`

**Step 1: Create the SIP utility**

Create `lib/sip.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the active System Instruction Profile for a user.
 * Returns the prompt text string, or null if no SIP exists.
 */
export async function getActiveSIP(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_instruction_profiles")
    .select("prompt_text")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.prompt_text;
}

/**
 * Fetches the user profile for a user.
 * Returns the profile object, or null if no profile exists.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export type UserProfile = {
  id: string;
  user_id: string;
  journey_stage: "exploring" | "crystallizing" | "executing";
  core_values: string[];
  motivations: string[];
  fears: string[];
  self_narrative: string | null;
  definition_of_success: string | null;
  life_stage: string | null;
  commitments: string[];
  energy_pattern: string;
  available_hours_per_day: number | null;
  preferred_tone: string;
  processing_style: string;
  accountability_style: string;
  onboarding_conversation: any[];
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
```

**Step 2: Verify the file compiles**

```bash
npx tsc --noEmit lib/sip.ts 2>&1 || echo "Check for type errors"
```

**Step 3: Commit**

```bash
git add lib/sip.ts
git commit -m "feat: add SIP and user profile fetch utilities"
```

---

## Task 3: Onboarding Chat API Route

**Files:**
- Create: `app/api/onboarding/chat/route.ts`

**Step 1: Create the onboarding chat API route**

Create `app/api/onboarding/chat/route.ts`:

```typescript
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
9. Your response MUST be valid JSON with this structure:
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

DO NOT collect all of these mechanically. Weave them into natural conversation. Some will emerge without asking directly. It's OK to not get every optional field.`;

export async function POST(request: Request) {
  try {
    const { messages, collectedData, userName, lang } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Determine what we still need
    const requiredFields = [
      "journey_stage", "core_values", "motivations", "life_context",
      "commitments", "energy_pattern", "preferred_tone", "accountability_style",
      "goal_relationship"
    ];
    const collected = collectedData || {};
    const remaining = requiredFields.filter(f => !collected[f] || (Array.isArray(collected[f]) && collected[f].length === 0));

    // Build conversation history string
    const historyStr = (messages || [])
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Menti"}: ${m.content}`)
      .join("\n");

    // Build the prompt
    const filledPrompt = META_PROMPT
      .replace("{collectedData}", JSON.stringify(collected, null, 2))
      .replace("{remainingFields}", remaining.length > 0 ? remaining.join(", ") : "ALL REQUIRED FIELDS COLLECTED — you can set readyToComplete to true after a natural closing message.")
      .replace("{conversationHistory}", historyStr || "(This is the first message. Open warmly.)");

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: filledPrompt,
      messages: [
        {
          role: "user",
          content: messages && messages.length > 0
            ? messages[messages.length - 1].content
            : `My name is ${userName || "friend"}. This is the start of our conversation.`
        }
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      // If parsing fails, treat the whole thing as a message
      parsed = {
        message: text,
        suggestedResponses: [],
        collectedData: collected,
        readyToComplete: false,
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Onboarding chat error:", error);
    return NextResponse.json(
      { error: "Failed to process onboarding chat" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the route compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "onboarding" || echo "No type errors in onboarding route"
```

**Step 3: Commit**

```bash
git add app/api/onboarding/chat/route.ts
git commit -m "feat: add onboarding chat API route with adaptive conversation"
```

---

## Task 4: Onboarding Complete API Route — Profile + SIP Generation

**Files:**
- Create: `app/api/onboarding/complete/route.ts`

**Step 1: Create the onboarding complete route**

Create `app/api/onboarding/complete/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

Return ONLY valid JSON.`;

export async function POST(request: Request) {
  try {
    const { userId, userName, collectedData, messages, lang } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });
    const supabase = await createClient();

    // Build transcript string
    const transcript = (messages || [])
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Menti"}: ${m.content}`)
      .join("\n");

    // Step 1: Generate structured profile from conversation
    const profilePrompt = PROFILE_GENERATOR_PROMPT
      .replace("{collectedData}", JSON.stringify(collectedData, null, 2))
      .replace("{transcript}", transcript);

    const profileResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: profilePrompt }],
    });

    const profileText = profileResponse.content[0].type === "text" ? profileResponse.content[0].text : "{}";
    let profile;
    try {
      const jsonMatch = profileText.match(/\{[\s\S]*\}/);
      profile = JSON.parse(jsonMatch ? jsonMatch[0] : profileText);
    } catch {
      profile = collectedData; // Fallback to raw collected data
    }

    // Step 2: Generate SIP from profile
    const sipPrompt = SIP_GENERATOR_PROMPT
      .replace("{profile}", JSON.stringify(profile, null, 2))
      .replaceAll("{userName}", userName || "friend");

    const sipResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      messages: [{ role: "user", content: sipPrompt }],
    });

    const sipText = sipResponse.content[0].type === "text" ? sipResponse.content[0].text : "";

    // Step 3: Generate summary card
    const summaryPrompt = SUMMARY_CARD_PROMPT
      .replace("{profile}", JSON.stringify(profile, null, 2))
      .replaceAll("{userName}", userName || "friend");

    const summaryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 512,
      messages: [{ role: "user", content: summaryPrompt }],
    });

    const summaryText = summaryResponse.content[0].type === "text" ? summaryResponse.content[0].text : "{}";
    let summaryCard;
    try {
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      summaryCard = JSON.parse(jsonMatch ? jsonMatch[0] : summaryText);
    } catch {
      summaryCard = {
        identityStatement: `Welcome, ${userName}`,
        keyInsights: ["Menti is getting to know you"],
        mentiApproach: "I'm here to help you on your journey.",
        closingLine: "Let's get started with your vision.",
      };
    }

    // Step 4: Save profile to database
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({
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
        onboarding_conversation: messages || [],
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Profile save error:", profileError);
    }

    // Step 5: Save SIP to database (deactivate old ones first)
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
```

**Step 2: Verify the route compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "onboarding/complete" || echo "No type errors"
```

**Step 3: Commit**

```bash
git add app/api/onboarding/complete/route.ts
git commit -m "feat: add onboarding complete route — profile + SIP + summary card generation"
```

---

## Task 5: Profile and SIP API Routes

**Files:**
- Create: `app/api/profile/route.ts`
- Create: `app/api/sip/route.ts`

**Step 1: Create the profile GET route**

Create `app/api/profile/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
```

**Step 2: Create the SIP GET route**

Create `app/api/sip/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_instruction_profiles")
      .select("prompt_text, version, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ sip: null });
    }

    return NextResponse.json({ sip: data.prompt_text, version: data.version });
  } catch (error) {
    console.error("SIP fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch SIP" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add app/api/profile/route.ts app/api/sip/route.ts
git commit -m "feat: add profile and SIP GET API routes"
```

---

## Task 6: Inject SIP into Existing API Routes

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `app/api/generate-tasks/route.ts` (and `lib/generate-tasks.ts`)
- Modify: `app/api/weekly-plan/route.ts`

**Step 1: Modify `/api/chat/route.ts`**

At the top of the file, add the import:

```typescript
import { getActiveSIP } from "@/lib/sip";
```

Inside the POST handler, after getting the userId (around line 60), fetch the SIP:

```typescript
// Fetch personalized SIP
const sip = userId ? await getActiveSIP(userId) : null;
```

Modify the `buildSystemPrompt` call to prepend the SIP. Change the system prompt construction (around line 75) to:

```typescript
const baseSystemPrompt = buildSystemPrompt(visionBoard, focusAreas, recentTasks);
const systemPrompt = sip ? `${sip}\n\n---\n\nADDITIONAL CONTEXT:\n${baseSystemPrompt}` : baseSystemPrompt;
```

Use `systemPrompt` instead of calling `buildSystemPrompt()` directly in the Claude API call.

**Step 2: Modify `/api/analyze/route.ts`**

At the top of the file, add:

```typescript
import { getActiveSIP } from "@/lib/sip";
```

In the POST handler, after getting the request body, fetch the SIP:

```typescript
const sip = userId ? await getActiveSIP(userId) : null;
```

Modify the system prompt in the Claude API call (around line 120) to prepend the SIP:

```typescript
const systemPrompt = sip
  ? `${sip}\n\n---\n\nANALYSIS INSTRUCTIONS:\n${prompt}`
  : prompt;
```

Where `prompt` is the existing `ANALYSIS_PROMPT` (with language replacement already applied). Pass `systemPrompt` as the `system` parameter.

**Step 3: Modify `/api/weekly-plan/route.ts`**

At the top, add:

```typescript
import { getActiveSIP } from "@/lib/sip";
```

After getting userId, fetch SIP:

```typescript
const sip = await getActiveSIP(userId);
```

Modify the Claude API call (around line 106) to prepend:

```typescript
const systemPrompt = sip
  ? `${sip}\n\n---\n\nTASK GENERATION INSTRUCTIONS:\n${taskPrompt}`
  : taskPrompt;
```

**Step 4: Modify `lib/generate-tasks.ts`**

Add a parameter for the SIP to `generateDailyTasks`:

```typescript
export async function generateDailyTasks(ctx: TaskGenerationContext, sipText?: string | null)
```

In the Claude API call (around line 75), modify the system parameter:

```typescript
system: sipText
  ? `${sipText}\n\n---\n\nTASK GENERATION INSTRUCTIONS:\n${prompt}`
  : prompt,
```

Then in `app/api/generate-tasks/route.ts`, fetch the SIP and pass it:

```typescript
import { getActiveSIP } from "@/lib/sip";

// Inside POST handler, after getting userId:
const sip = await getActiveSIP(userId);

// Pass to generateDailyTasks:
const tasks = await generateDailyTasks(ctx, sip);
```

**Step 5: Verify all routes compile**

```bash
npx tsc --noEmit 2>&1
```

**Step 6: Commit**

```bash
git add app/api/chat/route.ts app/api/analyze/route.ts app/api/weekly-plan/route.ts app/api/generate-tasks/route.ts lib/generate-tasks.ts
git commit -m "feat: inject SIP into all existing API routes for personalized responses"
```

---

## Task 7: Onboarding Chat UI Component

**Files:**
- Create: `components/OnboardingChat.tsx`

**Step 1: Create the conversational onboarding component**

Create `components/OnboardingChat.tsx`:

```typescript
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "assistant" | "user";
  content: string;
};

type SummaryCard = {
  identityStatement: string;
  keyInsights: string[];
  mentiApproach: string;
  closingLine: string;
};

type OnboardingChatProps = {
  firstName: string;
  userId: string;
  memberNumber: number | null;
};

export function OnboardingChat({ firstName, userId, memberNumber }: OnboardingChatProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"welcome" | "chat" | "summary" | "transition">("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryCard, setSummaryCard] = useState<SummaryCard | null>(null);
  const [typingDots, setTypingDots] = useState(0);
  const [numberRevealed, setNumberRevealed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome screen number reveal animation
  useEffect(() => {
    if (phase === "welcome") {
      setTimeout(() => setNumberRevealed(true), 600);
    }
  }, [phase]);

  // Typing dots animation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => setTypingDots(d => (d + 1) % 4), 400);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Start the conversation when entering chat phase
  useEffect(() => {
    if (phase === "chat" && messages.length === 0) {
      sendToMenti(null);
    }
  }, [phase]);

  async function sendToMenti(userMessage: string | null) {
    setLoading(true);
    setSuggestedResponses([]);

    const updatedMessages = userMessage
      ? [...messages, { role: "user" as const, content: userMessage }]
      : messages;

    if (userMessage) {
      setMessages(updatedMessages);
      setInputValue("");
    }

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          collectedData,
          userName: firstName,
          lang: "en",
        }),
      });

      const data = await res.json();

      if (data.message) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      }
      if (data.suggestedResponses) {
        setSuggestedResponses(data.suggestedResponses);
      }
      if (data.collectedData) {
        setCollectedData(data.collectedData);
      }
      if (data.readyToComplete) {
        await completeOnboarding(
          [...updatedMessages, { role: "assistant" as const, content: data.message }],
          data.collectedData || collectedData
        );
      }
    } catch (err) {
      console.error("Onboarding chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I had a moment. Could you try that again?" },
      ]);
    }

    setLoading(false);
  }

  async function completeOnboarding(finalMessages: Message[], finalData: Record<string, any>) {
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName: firstName,
          collectedData: finalData,
          messages: finalMessages,
          lang: "en",
        }),
      });

      const data = await res.json();
      if (data.summaryCard) {
        setSummaryCard(data.summaryCard);
        setPhase("summary");
      }
    } catch (err) {
      console.error("Onboarding complete error:", err);
      // Still transition even if summary fails
      finishOnboarding("upload");
    }
  }

  function finishOnboarding(destination: string) {
    localStorage.setItem("mentiva_onboarding_done", "true");
    router.push("/" + destination);
  }

  function handleSend() {
    if (!inputValue.trim() || loading) return;
    sendToMenti(inputValue.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const bgStyle = {
    background:
      "radial-gradient(ellipse 70% 50% at 75% 15%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 50% 0%, rgba(185,205,170,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(139,158,124,0.1) 0%, transparent 50%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)",
  };

  const glassCard = {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
  };

  // ============ WELCOME PHASE ============
  if (phase === "welcome") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, ...bgStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40, fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.5rem", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
          Founding Member
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(2.4rem, 8vw, 3.8rem)", lineHeight: 1.15, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Welcome to<br />Mentiva, <span style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</span>
        </h1>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
          fontSize: "clamp(3.5rem, 12vw, 5.5rem)", color: "#D4BE8C", lineHeight: 1,
          margin: "1.5rem 0 0.5rem",
          opacity: numberRevealed ? 1 : 0,
          transform: numberRevealed ? "scale(1)" : "scale(0.8)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          #{memberNumber ?? "--"}
        </div>
        <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
          of <strong style={{ color: "rgba(255,255,255,0.5)" }}>3,000</strong> founding members
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "1.15rem", color: "rgba(255,255,255,0.45)", marginTop: "2rem", maxWidth: 320 }}>
          Let&apos;s turn your dreams into a plan.
        </p>
        <button
          onClick={() => setPhase("chat")}
          style={{
            marginTop: "3rem", display: "inline-flex", alignItems: "center", gap: 8,
            padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
            border: "none", borderRadius: 60, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Let&apos;s get to know each other <span>&rarr;</span>
        </button>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  // ============ CHAT PHASE ============
  if (phase === "chat") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, ...bgStyle, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "1.5rem 1.5rem 1rem", textAlign: "center" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 300, color: "rgba(255,255,255,0.9)" }}>
            Getting to know you
          </p>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
            Talk to Menti
          </p>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "0.8rem 1rem",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              ...(msg.role === "user"
                ? { background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)" }
                : { ...glassCard }),
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
              animation: "fadeIn 0.3s ease",
            }}>
              {msg.content}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              alignSelf: "flex-start", maxWidth: "85%",
              padding: "0.8rem 1rem", borderRadius: "16px 16px 16px 4px",
              ...glassCard, color: "rgba(255,255,255,0.5)", fontSize: "0.9rem",
            }}>
              {".".repeat(typingDots + 1)}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested responses */}
        {suggestedResponses.length > 0 && !loading && (
          <div style={{ padding: "0 1rem 0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {suggestedResponses.map((suggestion, i) => (
              <button key={i} onClick={() => sendToMenti(suggestion)} style={{
                padding: "0.5rem 1rem", borderRadius: 20,
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.8)", fontSize: "0.8rem", cursor: "pointer",
                transition: "all 0.2s",
                backdropFilter: "blur(8px)",
              }}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: "0.75rem 1rem 2rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            style={{
              flex: 1, padding: "0.8rem 1rem", borderRadius: 24,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", outline: "none",
              backdropFilter: "blur(8px)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button onClick={handleSend} disabled={loading || !inputValue.trim()} style={{
            width: 44, height: 44, borderRadius: "50%",
            background: inputValue.trim() ? "white" : "rgba(255,255,255,0.15)",
            border: "none", cursor: inputValue.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={inputValue.trim() ? "#4A5C3F" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ============ SUMMARY CARD PHASE ============
  if (phase === "summary" && summaryCard) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, ...bgStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>
          Here&apos;s what I learned about you
        </p>

        <div style={{
          ...glassCard, borderRadius: 20, padding: "2rem 1.5rem", maxWidth: 400, width: "100%",
          animation: "fadeIn 0.6s ease",
        }}>
          {/* Identity statement */}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "1.5rem", color: "#D4BE8C", textAlign: "center",
            marginBottom: "1.5rem", lineHeight: 1.3,
          }}>
            {summaryCard.identityStatement}
          </h2>

          {/* Key insights */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {summaryCard.keyInsights.map((insight, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "0.6rem",
                fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5,
              }}>
                <span style={{ color: "#D4BE8C", marginTop: 2, flexShrink: 0 }}>-</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "1rem 0" }} />

          {/* Menti's approach */}
          <p style={{
            fontStyle: "italic", fontSize: "0.9rem",
            color: "rgba(255,255,255,0.6)", lineHeight: 1.6, textAlign: "center",
          }}>
            &ldquo;{summaryCard.mentiApproach}&rdquo;
          </p>

          {/* Closing line */}
          <p style={{
            fontSize: "0.85rem", color: "rgba(255,255,255,0.5)",
            textAlign: "center", marginTop: "1rem",
          }}>
            {summaryCard.closingLine}
          </p>
        </div>

        <button
          onClick={() => finishOnboarding("upload")}
          style={{
            marginTop: "2rem", display: "inline-flex", alignItems: "center", gap: 8,
            padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
            border: "none", borderRadius: 60, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          Continue to my vision <span>&rarr;</span>
        </button>

        <button onClick={() => finishOnboarding("dashboard")} style={{
          marginTop: "1rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.35)",
          background: "none", border: "none", cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 3,
        }}>
          I&apos;ll explore first
        </button>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
```

**Step 2: Verify the component compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "OnboardingChat" || echo "No type errors"
```

**Step 3: Commit**

```bash
git add components/OnboardingChat.tsx
git commit -m "feat: add conversational onboarding chat UI component with 3 phases"
```

---

## Task 8: Replace Old Onboarding in Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Update imports**

Replace the Onboarding import at line 9:

```typescript
// OLD:
import { Onboarding } from "@/components/Onboarding";

// NEW:
import { OnboardingChat } from "@/components/OnboardingChat";
```

**Step 2: Add userId state**

Add a new state variable alongside the existing ones (around line 41):

```typescript
const [userId, setUserId] = useState("");
```

**Step 3: Store userId in the useEffect**

Inside the useEffect (around line 47, after getting the session), add:

```typescript
setUserId(session.user.id);
```

**Step 4: Replace the Onboarding render**

Change line 112 from:

```typescript
return <Onboarding firstName={userName} memberNumber={memberNumber} />;
```

To:

```typescript
return <OnboardingChat firstName={userName} userId={userId} memberNumber={memberNumber} />;
```

**Step 5: Verify the page compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "dashboard" || echo "No type errors"
```

**Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: replace static onboarding slides with conversational OnboardingChat"
```

---

## Task 9: Enhanced Vision Upload — 3 Paths

**Files:**
- Modify: `app/upload/page.tsx`

This task modifies the existing upload page to detect the user's `journey_stage` from their profile and present the appropriate path.

**Step 1: Read the current upload page to understand its exact structure**

Before making changes, read `app/upload/page.tsx` fully to understand the current state machine and UI.

**Step 2: Add profile fetch + path detection**

At the top of the upload page component, add:

```typescript
import { createClient } from "@/lib/supabase";

// Inside the component, add state:
const [journeyStage, setJourneyStage] = useState<"exploring" | "crystallizing" | "executing">("executing");
const [profileLoaded, setProfileLoaded] = useState(false);

// In the initial useEffect, fetch the profile:
useEffect(() => {
  (async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const res = await fetch(`/api/profile?userId=${session.user.id}`);
      const data = await res.json();
      if (data.profile?.journey_stage) {
        setJourneyStage(data.profile.journey_stage);
      }
    }
    setProfileLoaded(true);
  })();
}, []);
```

**Step 3: Add guided discovery state and UI for Path B (exploring)**

Add new state for the discovery conversation:

```typescript
const [discoveryMessages, setDiscoveryMessages] = useState<{ role: string; content: string }[]>([]);
const [discoveryInput, setDiscoveryInput] = useState("");
const [discoveryLoading, setDiscoveryLoading] = useState(false);
const [discoveryThemes, setDiscoveryThemes] = useState<string[]>([]);
```

Add a new step to the state machine: `"discovery"` alongside existing steps like `"upload"`, `"analyzing"`, etc.

When `journeyStage === "exploring"`, show an initial screen that says:
> "Let's figure out your vision together. I'm going to ask you some questions, and we'll start to see what lights you up."

With a button "Let's discover" that enters the discovery conversation flow, and a secondary link "I already have a board" that goes to the standard upload.

The discovery conversation uses the same `/api/onboarding/chat` endpoint but with a different meta-prompt context, OR a new dedicated `/api/vision/discover` route.

**Step 4: Add hybrid mode for Path C (crystallizing)**

When `journeyStage === "crystallizing"`, show:
> "You've got a sense of where you're headed. Let's sharpen it."

With options to either upload a board OR answer 2-3 quick questions first, then optionally upload.

**Step 5: Path A (executing) stays as current behavior**

The existing upload flow is already Path A. No changes needed for the `executing` stage — it goes straight to upload.

**Step 6: Verify the page compiles and test all 3 paths**

```bash
npx tsc --noEmit 2>&1 | grep -i "upload" || echo "No type errors"
```

**Step 7: Commit**

```bash
git add app/upload/page.tsx
git commit -m "feat: add 3-path vision upload flow based on user journey stage"
```

---

## Task 10: Enhanced Vision Analysis with Blind Spots

**Files:**
- Modify: `app/api/analyze/route.ts`
- Modify: `lib/analyze-types.ts`

**Step 1: Update the AnalysisResult type**

In `lib/analyze-types.ts`, add new fields:

```typescript
export type GoalWithSteps = {
  goal: string;
  area?: string;
  emotionalWhy?: string;  // NEW: why this goal matters to THIS person
  steps: string[];
};

export type AnalysisResult = {
  summary: string;
  themes: string[];
  goals: string[];
  patterns: string[];
  actionSteps: { step: number; title: string; description: string }[];
  goalsWithSteps: GoalWithSteps[];
  insight: string;
  blindSpots?: string[];     // NEW: what's missing from their vision
  connections?: string[];     // NEW: how their goals connect
  visionType?: string;        // NEW: 'board_upload' | 'guided_discovery' | 'hybrid'
};
```

**Step 2: Update the ANALYSIS_PROMPT in `/api/analyze/route.ts`**

Modify the analysis prompt to include blind spot detection and emotional "why" per goal. Add to the JSON schema in the prompt:

```
"blindSpots": ["1-3 things notably ABSENT from the vision board — health, relationships, finances, rest, fun, etc. Only mention if genuinely missing."],
"connections": ["1-2 ways the goals connect to each other that the user might not have noticed"],
```

And update the goalsWithSteps instruction to include:

```
Each goal MUST have an "emotionalWhy" field: a brief sentence about why this goal likely matters to this person based on the overall board context.
```

**Step 3: Verify the route compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "analyze" || echo "No type errors"
```

**Step 4: Commit**

```bash
git add lib/analyze-types.ts app/api/analyze/route.ts
git commit -m "feat: add blind spot detection and emotional 'why' to vision analysis"
```

---

## Task 11: Polish & Integration Testing

**Files:**
- All files from Tasks 1-10

**Step 1: Run a full type check**

```bash
npx tsc --noEmit
```

Fix any type errors that come up.

**Step 2: Run the dev server and test the full flow**

```bash
npm run dev
```

Test manually:
1. Clear `localStorage` (delete `mentiva_onboarding_done` key)
2. Log in → should see welcome screen with member number
3. Click "Let's get to know each other" → conversation with Menti begins
4. Go through 5-8 exchanges → Menti should ask about journey, values, tone, accountability
5. Conversation completes → summary card appears with personalized insights
6. Click "Continue to my vision" → upload page adapts based on journey_stage
7. Upload a vision board → analysis should include blind spots, connections, emotional why
8. Go to chat → Menti should speak in the user's preferred tone
9. Go to /today → tasks should be framed through user's values and context

**Step 3: Fix any bugs discovered during testing**

Address issues one at a time, committing each fix.

**Step 4: Run the build to verify production readiness**

```bash
npm run build
```

Fix any build errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: polish and integration fixes for conversational onboarding MVP"
```

---

## Task 12: Final PR

**Step 1: Push all changes**

```bash
git push origin claude/naughty-blackwell
```

**Step 2: Update the existing PR or create a new one**

The PR at https://github.com/mikac444/mentiva-app/pull/1 already exists. Push updates to it, or if a new branch is needed:

```bash
gh pr create --title "feat: conversational onboarding + SIP + enhanced vision upload" --body "$(cat <<'EOF'
## Summary
- Replaces static 3-slide onboarding with adaptive Menti conversation (5-8 exchanges)
- Generates personalized System Instruction Profile (SIP) per user
- Injects SIP into all existing API routes (chat, analyze, tasks, weekly-plan)
- Adds "Here's what I learned about you" summary card
- 3-path vision upload flow (have vision / discovering / kinda know)
- Enhanced vision analysis with blind spot detection and emotional "why" per goal
- New database tables: user_profiles, system_instruction_profiles

## New API routes
- POST /api/onboarding/chat — drives adaptive onboarding conversation
- POST /api/onboarding/complete — generates profile + SIP + summary card
- GET /api/profile — fetch user profile
- GET /api/sip — fetch active SIP

## Modified API routes
- POST /api/chat — now injects SIP
- POST /api/analyze — now injects SIP + blind spot detection
- POST /api/generate-tasks — now injects SIP
- POST /api/weekly-plan — now injects SIP

## Test plan
- [ ] Fresh user onboarding: welcome → conversation → summary card → vision upload
- [ ] Verify SIP is stored in database after onboarding
- [ ] Verify chat responses are personalized (tone matches user preference)
- [ ] Verify task generation uses SIP context
- [ ] Verify 3 upload paths work based on journey_stage
- [ ] Verify blind spots appear in vision analysis
- [ ] Test on mobile (responsive)
- [ ] Run npm run build successfully

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary of All Files

### New files created:
1. `lib/supabase/schema.sql` — Database migration
2. `lib/sip.ts` — SIP + profile fetch utilities
3. `app/api/onboarding/chat/route.ts` — Onboarding conversation API
4. `app/api/onboarding/complete/route.ts` — Profile + SIP generation API
5. `app/api/profile/route.ts` — Profile GET route
6. `app/api/sip/route.ts` — SIP GET route
7. `components/OnboardingChat.tsx` — Conversational onboarding UI

### Modified files:
8. `app/dashboard/page.tsx` — Swap old Onboarding for OnboardingChat
9. `app/upload/page.tsx` — 3-path vision flow based on journey_stage
10. `app/api/chat/route.ts` — Inject SIP
11. `app/api/analyze/route.ts` — Inject SIP + blind spots + emotional why
12. `app/api/generate-tasks/route.ts` — Inject SIP
13. `app/api/weekly-plan/route.ts` — Inject SIP
14. `lib/generate-tasks.ts` — Accept SIP parameter
15. `lib/analyze-types.ts` — Add new type fields
