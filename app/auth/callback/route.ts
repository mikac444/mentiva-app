import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is a new user (no onboarding completed) → redirect to welcome/referral page
      let finalRedirect = redirectTo;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("onboarding_completed_at")
            .eq("user_id", user.id)
            .single();
          // New user: no profile or onboarding not completed → show welcome page
          if (!profile || !profile.onboarding_completed_at) {
            finalRedirect = "/welcome";
          }
        }
      } catch {
        // If check fails, proceed with default redirect
      }

      const response = NextResponse.redirect(new URL(finalRedirect, origin));
      // Explicitly set all auth cookies on the redirect response
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
