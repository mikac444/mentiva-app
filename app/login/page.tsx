"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace('/dashboard');
          return;
        }
      } catch (e) {}
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  async function handleGoogleSignIn() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://mentiva.app/auth/callback?redirectTo=%2Fdashboard",
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error("Google sign in error:", error);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  if (checking) {
    return (
      <div className="w-full max-w-md animate-pulse">
        <div className="h-9 rounded mx-auto w-3/4" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="mt-2 h-4 rounded mx-auto w-1/2" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="mt-8 h-12 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-serif font-light text-3xl sm:text-4xl text-center" style={{ color: "rgba(255,255,255,0.9)" }}>
        Welcome back
      </h1>
      <p className="mt-2 text-center text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
        Sign in to access your vision boards
      </p>
      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors hover:bg-white/25"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "white",
            backdropFilter: "blur(10px)",
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
      <p className="mt-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
        Don&apos;t have an account? Sign in with Google to get started.
      </p>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <div className="h-9 rounded mx-auto w-3/4" style={{ background: "rgba(255,255,255,0.15)" }} />
      <div className="mt-2 h-4 rounded mx-auto w-1/2" style={{ background: "rgba(255,255,255,0.15)" }} />
      <div className="mt-8 h-12 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-mentiva-gradient">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/"
          className="font-serif font-light text-2xl uppercase shrink-0 transition-colors hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.35em" }}
        >
          Mentiva
        </Link>
        <Link
          href="/"
          className="text-sm transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Back
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
