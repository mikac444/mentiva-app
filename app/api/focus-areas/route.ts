import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}

export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdminSupabase();
    const { data } = await supabase
      .from("user_focus_areas")
      .select("*")
      .eq("user_id", user.id);

    return NextResponse.json({ areas: data ?? [] });
  } catch (err) {
    console.error("Focus areas GET error:", err);
    return NextResponse.json({ error: "Failed to fetch focus areas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { areas } = await request.json();
    if (!areas) return NextResponse.json({ error: "areas required" }, { status: 400 });

    const supabase = getAdminSupabase();

    // Replace all focus areas
    await supabase.from("user_focus_areas").delete().eq("user_id", user.id);

    if (areas.length > 0) {
      await supabase.from("user_focus_areas").insert(
        areas.map((a: string) => ({ user_id: user.id, area: a }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Focus areas POST error:", err);
    return NextResponse.json({ error: "Failed to update focus areas" }, { status: 500 });
  }
}
