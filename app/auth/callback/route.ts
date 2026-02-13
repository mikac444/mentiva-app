import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user?.email) {
      const { data } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", session.user.email.toLowerCase())
        .single();

      if (!data) {
        return NextResponse.redirect(new URL("/unauthorized", origin));
      }
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
