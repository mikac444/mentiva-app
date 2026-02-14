"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function UnauthorizedPage() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex flex-col bg-mentiva-gradient">
      <header className="px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/"
          className="font-serif font-light text-2xl uppercase transition-colors hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.35em" }}
        >
          Mentiva
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="font-serif font-light text-2xl sm:text-3xl" style={{ color: "rgba(255,255,255,0.9)" }}>
            Mentiva is in early access
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            This app is currently available to founding members only. Join us and turn your vision board into an actionable plan with AI-powered mentoring.
          </p>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            $10 lifetime founding membership
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg font-semibold py-3 px-4 text-center transition-colors hover:opacity-90"
              style={{ background: "#FFFFFF", color: "#4A5C3F" }}
            >
              Become a founding member
            </a>
            <a
              href="mailto:mika@mentiva.app"
              className="text-sm transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Already a member? Contact us
            </a>
          </div>
        </div>
      </main>

      <div className="flex justify-center pb-12">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
