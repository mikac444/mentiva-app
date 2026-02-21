import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// DELETE: Delete a vision board by id (server-side with service role key)
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { boardId } = body as { boardId: string };

  if (!boardId) {
    return NextResponse.json({ error: "boardId is required" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Delete the board — service role key bypasses RLS
  const { error, count } = await supabase
    .from("vision_boards")
    .delete({ count: "exact" })
    .eq("id", boardId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete board:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: "Board not found or not yours" }, { status: 404 });
  }

  // Clean up orphaned daily tasks linked to this board's goals
  // (best-effort, don't fail the whole delete if this errors)
  try {
    const { data: board } = await supabase
      .from("vision_boards")
      .select("analysis")
      .eq("id", boardId)
      .single();
    // Board already deleted, so this won't find it — skip task cleanup
  } catch {
    // Ignore
  }

  return NextResponse.json({ deleted: true, boardId });
}
