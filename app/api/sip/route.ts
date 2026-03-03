import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("system_instruction_profiles")
      .select("prompt_text, version, created_at")
      .eq("user_id", user.id)
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
    return NextResponse.json(
      { error: "Failed to fetch SIP" },
      { status: 500 }
    );
  }
}
