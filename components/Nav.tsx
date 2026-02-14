"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavProps = {
  active?: "dashboard" | "upload" | "chat";
  hideHamburger?: boolean;
};

const linkBase = "text-sm transition-colors";
const linkActive = "font-medium text-white";
const linkInactive = "hover:text-white";
const linkInactiveColor = { color: "rgba(255,255,255,0.6)" };

export function Nav({ active, hideHamburger }: NavProps) {
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
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  const fullName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    null;
  const firstName = fullName?.split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "Account";
  const email = user?.email ?? null;

  const closeMobile = () => setMobileMenuOpen(false);

  const glassStyle = {
    background: "rgba(100,120,90,0.95)",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
  };

  return (
    <div ref={navRef} className="relative flex items-center justify-between w-full">
      <Link
        href={user ? "/dashboard" : "/"}
        className="font-serif font-light text-2xl uppercase shrink-0 transition-opacity hover:opacity-80"
        style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.35em" }}
      >
        Mentiva
      </Link>

      <nav className="hidden md:flex items-center gap-4 ml-6">
        <Link
          href="/dashboard"
          className={`${linkBase} ${active === "dashboard" ? linkActive : linkInactive}`}
          style={active === "dashboard" ? undefined : linkInactiveColor}
        >
          Dashboard
        </Link>
        <Link
          href="/upload"
          className={`${linkBase} ${active === "upload" ? linkActive : linkInactive}`}
          style={active === "upload" ? undefined : linkInactiveColor}
        >
          Upload
        </Link>
        <Link
          href="/chat"
          className={`${linkBase} ${active === "chat" ? linkActive : linkInactive}`}
          style={active === "chat" ? undefined : linkInactiveColor}
        >
          AI Chat
        </Link>
        {user && (
          <div className="relative border-l pl-3" style={{ borderColor: "rgba(255,255,255,0.15)" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className={`flex items-center gap-1 ${linkBase} ${linkInactive}`}
              style={linkInactiveColor}
            >
              <span>{firstName}</span>
              <span className="text-xs" aria-hidden style={{ color: "rgba(255,255,255,0.35)" }}>▼</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[220px] rounded-lg shadow-xl py-2 z-50" style={glassStyle}>
                <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  {fullName && (
                    <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }} title={fullName}>
                      {fullName}
                    </p>
                  )}
                  {email && (
                    <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }} title={email}>
                      {email}
                    </p>
                  )}
                </div>
                <a
                  href="mailto:mika@mentiva.app"
                  className="block px-3 py-2 text-sm transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                  onClick={() => setDropdownOpen(false)}
                >
                  Send feedback
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.7)" }}
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
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden p-2 -mr-2 transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </button>

          <div
            className={`md:hidden absolute top-full left-0 right-0 z-50 overflow-hidden transition-[max-height] duration-200 ease-out ${
              mobileMenuOpen ? "max-h-[80vh]" : "max-h-0"
            }`}
          >
            <div className="shadow-xl border-t" style={{ ...glassStyle, borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="px-4 py-3 flex flex-col gap-0">
                <Link
                  href="/dashboard"
                  onClick={closeMobile}
                  className={`py-3 border-b ${linkBase} ${active === "dashboard" ? linkActive : linkInactive}`}
                  style={active === "dashboard" ? undefined : linkInactiveColor}
                >
                  Dashboard
                </Link>
                <Link
                  href="/upload"
                  onClick={closeMobile}
                  className={`py-3 border-b ${linkBase} ${active === "upload" ? linkActive : linkInactive}`}
                  style={active === "upload" ? undefined : linkInactiveColor}
                >
                  Upload
                </Link>
                <Link
                  href="/chat"
                  onClick={closeMobile}
                  className={`py-3 border-b ${linkBase} ${active === "chat" ? linkActive : linkInactive}`}
                  style={active === "chat" ? undefined : linkInactiveColor}
                >
                  AI Chat
                </Link>
                {user && (
                  <div className="pt-3 pb-1">
                    {fullName && (
                      <p className="text-sm font-medium truncate px-1" style={{ color: "rgba(255,255,255,0.9)" }}>{fullName}</p>
                    )}
                    {email && (
                      <p className="text-xs truncate mt-0.5 px-1" style={{ color: "rgba(255,255,255,0.55)" }}>{email}</p>
                    )}
                    <a
                      href="mailto:mika@mentiva.app"
                      onClick={closeMobile}
                      className="block py-2.5 px-1 text-sm transition-colors hover:text-white"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      Send feedback
                    </a>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left py-2.5 px-1 text-sm transition-colors hover:text-white"
                      style={{ color: "rgba(255,255,255,0.7)" }}
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
