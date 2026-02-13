"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavProps = {
  active?: "dashboard" | "upload" | "chat";
  hideHamburger?: boolean;
};

const linkClass = (active: boolean) =>
  active
    ? "text-gold-400 font-medium text-sm"
    : "text-sage-400 hover:text-gold-400 transition-colors text-sm";

export function Nav({ active, hideHamburger }: NavProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  async function handleSignOut() {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
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

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <div ref={navRef} className="relative flex items-center justify-between w-full">
      <Link
        href={user ? "/dashboard" : "/"}
        className="font-serif text-2xl text-gold-400 shrink-0"
      >
        Mentiva
      </Link>

      {/* Desktop nav (md and above) */}
      <nav className="hidden md:flex items-center gap-4 ml-6">
        <Link href="/dashboard" className={linkClass(active === "dashboard")}>
          Dashboard
        </Link>
        <Link href="/upload" className={linkClass(active === "upload")}>
          Upload
        </Link>
        <Link href="/chat" className={linkClass(active === "chat")}>
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

      {!hideHamburger && (
        <>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden p-2 -mr-2 text-sage-400 hover:text-gold-400 transition-colors"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </button>

          {/* Mobile slide-down menu */}
          <div
        className={`md:hidden absolute top-full left-0 right-0 z-50 overflow-hidden transition-[max-height] duration-200 ease-out ${
          mobileMenuOpen ? "max-h-[80vh]" : "max-h-0"
        }`}
      >
        <div className="bg-sage-900 border-b border-sage-700 border-t border-sage-800 shadow-xl">
          <div className="px-4 py-3 flex flex-col gap-0">
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className={`py-3 border-b border-sage-700/80 ${linkClass(active === "dashboard")}`}
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              onClick={closeMobile}
              className={`py-3 border-b border-sage-700/80 ${linkClass(active === "upload")}`}
            >
              Upload
            </Link>
            <Link
              href="/chat"
              onClick={closeMobile}
              className={`py-3 border-b border-sage-700/80 ${linkClass(active === "chat")}`}
            >
              AI Chat
            </Link>
            {user && (
              <div className="pt-3 pb-1">
                {fullName && (
                  <p className="text-sage-100 text-sm font-medium truncate px-1">{fullName}</p>
                )}
                {email && (
                  <p className="text-sage-500 text-xs truncate mt-0.5 px-1">{email}</p>
                )}
                <a
                  href="mailto:mika@mentiva.app"
                  onClick={closeMobile}
                  className="block py-2.5 px-1 text-sage-300 hover:text-gold-400 text-sm transition-colors"
                >
                  Send feedback
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left py-2.5 px-1 text-sage-300 hover:text-gold-400 text-sm transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
