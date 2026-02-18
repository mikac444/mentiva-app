import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("user_focus_areas")
    .select("*")
    .eq("user_id", userId);

  return NextResponse.json({ areas: data ?? [] });
}

export async function POST(request: Request) {
  const { userId, areas } = await request.json();
  if (!userId || !areas) return NextResponse.json({ error: "userId and areas required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Replace all focus areas
  await supabase.from("user_focus_areas").delete().eq("user_id", userId);
  
  if (areas.length > 0) {
    await supabase.from("user_focus_areas").insert(
      areas.map((a: string) => ({ user_id: userId, area: a }))
    );
  }

  return NextResponse.json({ success: true });
}
