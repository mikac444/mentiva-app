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
    return NextResponse.json(
      { error: "Failed to fetch SIP" },
      { status: 500 }
    );
  }
}
