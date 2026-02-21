import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/unauthorized"];
const PROTECTED_PATHS = ["/dashboard", "/chat", "/upload", "/admin"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(request.nextUrl.pathname)) {
    if (request.nextUrl.pathname === "/login" && user?.email) {
      const { data } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", user.email.toLowerCase())
        .single();
      if (data) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        redirectUrl.searchParams.delete("redirectTo");
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return response;
  }

  if (isProtectedPath(request.nextUrl.pathname)) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    const email = user.email;
    if (!email) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    const { data } = await supabase
      .from("allowed_emails")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();
    if (!data) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return response;
}
