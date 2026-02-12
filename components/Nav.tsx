"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavProps = {
  active?: "dashboard" | "upload" | "chat";
};

export function Nav({ active }: NavProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  async function handleSignOut() {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const fullName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    null;
  const firstName = fullName?.split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "Account";
  const email = user?.email ?? null;

  return (
    <>
      <Link
        href={user ? "/dashboard" : "/"}
        className="font-serif text-2xl text-gold-400"
      >
        Mentiva
      </Link>
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
          <div className="relative border-l border-sage-700 pl-3" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1 text-sage-400 hover:text-gold-400 text-sm transition-colors"
            >
              <span>{firstName}</span>
              <span className="text-sage-500 text-xs" aria-hidden>▼</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[220px] rounded-lg border border-sage-700 bg-sage-900 shadow-lg py-2 z-50">
                <div className="px-3 py-2 border-b border-sage-700/80">
                  {fullName && (
                    <p className="text-sage-100 text-sm font-medium truncate" title={fullName}>
                      {fullName}
                    </p>
                  )}
                  {email && (
                    <p className="text-sage-500 text-xs truncate mt-0.5" title={email}>
                      {email}
                    </p>
                  )}
                </div>
                <a
                  href="mailto:mika@mentiva.app"
                  className="block px-3 py-2 text-sage-300 hover:bg-sage-800 hover:text-gold-400 text-sm transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Send feedback
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sage-300 hover:bg-sage-800 hover:text-gold-400 text-sm transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
