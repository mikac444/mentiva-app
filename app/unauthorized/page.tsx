"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/"
          className="font-serif text-2xl text-gold-400"
        >
          Mentiva
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-sage-700 bg-sage-900/50 p-8 shadow-xl">
          <h1 className="font-serif text-2xl sm:text-3xl text-sage-100 text-center">
            Mentiva is in early access
          </h1>
          <p className="mt-4 text-sage-400 text-sm text-center leading-relaxed">
            This app is currently available to founding members only. Join us and turn your vision board into an actionable plan with AI-powered mentoring.
          </p>
          <p className="mt-4 text-sage-300 text-sm text-center font-medium">
            $10 lifetime founding membership
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <a
              href="https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-gold-500 hover:bg-gold-400 text-sage-950 font-semibold py-3 px-4 text-center transition-colors"
            >
              Become a founding member
            </a>
            <a
              href="mailto:mika@mentiva.app"
              className="text-sage-500 hover:text-gold-400 text-sm transition-colors"
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
          className="text-sage-500 hover:text-gold-400 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
