"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavProps = {
  active?: "dashboard" | "upload" | "chat";
};

export function Nav({ active }: NavProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const client = createClient();
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <nav className="flex items-center gap-3 sm:gap-4">
      <Link
        href="/dashboard"
        className={
          active === "dashboard"
            ? "text-gold-400 font-medium text-sm"
            : "text-sage-400 hover:text-gold-400 transition-colors text-sm"
        }
      >
        Dashboard
      </Link>
      <Link
        href="/upload"
        className={
          active === "upload"
            ? "text-gold-400 font-medium text-sm"
            : "text-sage-400 hover:text-gold-400 transition-colors text-sm"
        }
      >
        Upload
      </Link>
      <Link
        href="/chat"
        className={
          active === "chat"
            ? "text-gold-400 font-medium text-sm"
            : "text-sage-400 hover:text-gold-400 transition-colors text-sm"
        }
      >
        AI Chat
      </Link>
      {user && (
        <>
          <span className="hidden sm:inline text-sage-500 text-sm border-l border-sage-700 pl-3">
            {displayName}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sage-500 hover:text-gold-400 text-sm transition-colors"
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  );
}
