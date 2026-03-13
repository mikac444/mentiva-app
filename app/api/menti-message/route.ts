import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveSIP } from "@/lib/sip";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function progressFallback(
  completed: number,
  total: number,
  name: string,
  lang: string
): string {
  if (total === 0) {
    return lang === "es"
      ? `Hola ${name}, tus misiones estan listas.`
      : `Hey ${name}, your missions are ready.`;
  }
  if (completed === total) {
    return lang === "es"
      ? `Increible, ${name}. Completaste todas tus misiones hoy.`
      : `Amazing, ${name}. You completed all your missions today.`;
  }
  if (completed > 0) {
    const remaining = total - completed;
    return lang === "es"
      ? `Vas bien, ${name}. Te faltan ${remaining} mas. Tu puedes.`
      : `You're making progress, ${name}. ${remaining} more to go. You've got this.`;
  }
  return lang === "es"
    ? `Tus misiones estan listas, ${name}. Empieza con la que se sienta mas facil.`
    : `Your missions are ready, ${name}. Start with whichever feels easiest.`;
}

// POST /api/menti-message
export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success: rateLimitOk } = rateLimit(user.id, { maxRequests: 15, windowMs: 600000 });
    if (!rateLimitOk) {
      return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
    }

    const { userName, lang, tasksCompleted, tasksTotal } = await request.json();
    const name = userName || "friend";

    const supabase = getAdminSupabase();

    // Fetch last 3 days of journal entries
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: entries } = await supabase
      .from("journal_entries")
      .select("content, date, created_at")
      .eq("user_id", user.id)
      .gte("date", threeDaysAgo.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(10);

    // No journal entries — return static progress message (no AI call)
    if (!entries || entries.length === 0) {
      return NextResponse.json({
        message: progressFallback(tasksCompleted || 0, tasksTotal || 0, name, lang || "en"),
        source: "progress",
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: progressFallback(tasksCompleted || 0, tasksTotal || 0, name, lang || "en"),
        source: "progress",
      });
    }

    const sip = await getActiveSIP(user.id);
    const anthropic = new Anthropic({ apiKey });

    const journalContext = entries
      .map((e) => `[${e.date}] ${String(e.content).slice(0, 500)}`)
      .join("\n");

    const langName = lang === "es" ? "SPANISH" : "ENGLISH";

    const prompt = `You are Menti, a warm AI life mentor. Generate ONE short, personalized message (1-2 sentences max) for ${name}.

RECENT JOURNAL ENTRIES:
${journalContext}

TASK PROGRESS TODAY: ${tasksCompleted || 0} of ${tasksTotal || 0} completed.

RULES:
- Reference something specific from their journal to show you're listening
- Be warm, empathetic, and encouraging
- If they mentioned stress/overwhelm, suggest starting gently
- If they mentioned excitement, match their energy
- Keep it SHORT (under 30 words)
- Language: ${langName}
- Do NOT ask questions. Just give a supportive statement.
- NO emojis

Respond with ONLY the message text, nothing else.`;

    const systemPrompt = sip ? `${sip}\n\n---\n\n${prompt}` : prompt;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: "user", content: "Generate my personalized message for today." }],
    });

    const message = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ message, source: "journal" });
  } catch (err) {
    console.error("Menti message error:", err);
    // Silently fall back to empty — the UI will use its own fallback
    return NextResponse.json({ message: "", source: "error" });
  }
}
