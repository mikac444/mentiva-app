"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language";

// Pages where BottomNav should NOT appear
const HIDDEN_PATHS = ["/login", "/welcome", "/terms", "/privacy", "/unauthorized", "/payment-success", "/admin"];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Hide on non-app pages
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  // Hide if on landing page
  if (pathname === "/") return null;

  const tabs = [
    {
      label: t("Boards", "Tableros"),
      href: "/dashboard",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: t("Today", "Hoy"),
      href: "/today",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
    },
    {
      label: "Menti",
      href: "/chat",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/upload";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="sm:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(44,48,40,0.06)",
        display: "flex",
        justifyContent: "space-around",
        padding: "0.65rem 0 1.5rem",
        zIndex: 50,
        maxWidth: "100%",
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              color: active ? "#2C3028" : "#9DA894",
              textDecoration: "none",
              transition: "color 0.3s",
              fontSize: "0.6rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
