"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!dropOpen) return;
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropOpen]);

  const firstName = user?.user_metadata?.full_name?.split(/\s+/)[0] ?? user?.user_metadata?.name?.split(/\s+/)[0] ?? "";

  const tabs = [
    { label: "Boards", href: "/dashboard" },
    { label: "Today", href: "/today" },
    { label: "Menti", href: "/chat" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/upload";
    return pathname.startsWith(href);
  }

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.75rem 1.5rem",
      background: "rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(10px)",
    }}>
      <Link href="/dashboard" style={{
        fontFamily: "serif", fontWeight: 300, fontSize: "1.1rem",
        color: "rgba(255,255,255,0.4)", letterSpacing: "0.25em",
        textTransform: "uppercase", textDecoration: "none",
      }}>
        Mentiva
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{
              padding: "0.5rem 0.9rem", borderRadius: 10,
              fontSize: "0.85rem", fontWeight: active ? 600 : 500,
              color: active ? "white" : "rgba(255,255,255,0.5)",
              background: active ? "rgba(255,255,255,0.12)" : "transparent",
              textDecoration: "none", transition: "all 0.3s",
            }}>
              {tab.label}
            </Link>
          );
        })}

        {user && (
          <div ref={dropRef} style={{ position: "relative", marginLeft: "0.6rem" }}>
            <button onClick={() => setDropOpen((o) => !o)} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "0.45rem 0.7rem", borderRadius: 10,
              background: dropOpen ? "rgba(255,255,255,0.12)" : "transparent",
              border: "none", cursor: "pointer", transition: "all 0.3s",
              color: "rgba(255,255,255,0.55)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </button>
            {dropOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                minWidth: 200, borderRadius: 14, padding: "0.5rem 0",
                background: "rgba(80,100,70,0.97)", border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)", boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                zIndex: 100,
              }}>
                {firstName && (
                  <div style={{ padding: "0.6rem 1rem 0.7rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{firstName}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{user.email}</div>
                  </div>
                )}
                <a href="mailto:mika@mentiva.app" onClick={() => setDropOpen(false)} style={{
                  display: "block", padding: "0.6rem 1rem", fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.6)", textDecoration: "none",
                }}>Send feedback</a>
                <button onClick={async () => {
                  setDropOpen(false);
                  const supabase = createClient();
                  await supabase.auth.signOut({ scope: "global" });
                  window.location.href = "/login";
                }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.6rem 1rem", fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer",
                }}>Sign out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
