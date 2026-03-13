"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function PaymentSuccessPage() {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(172deg, #B2C4A0 0%, #C0D4AA 25%, #CCDABC 48%, #D3D0C4 72%, #DAD7CB 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl animate-[drift_20s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, #BBCBA8 0%, transparent 70%)",
            top: "10%",
            left: "10%",
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
            top: "60%",
            right: "15%",
          }}
        />
      </div>
      <style>{`@keyframes drift { 0%,100%{transform:translate(0,0)} 25%{transform:translate(20px,-30px)} 50%{transform:translate(-15px,20px)} 75%{transform:translate(30px,10px)} }`}</style>

      {/* Noise overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 pt-8 pb-4">
        <p
          className="text-center font-serif font-light tracking-[0.35em] uppercase"
          style={{ color: "#9DA894", fontSize: "0.9rem" }}
        >
          MENTIVA
        </p>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md mx-auto text-center space-y-6 animate-[rise_0.8s_ease-out_both]">
          {/* Success checkmark */}
          <div
            className="animate-[scaleIn_0.6s_ease-out_0.2s_both]"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(107,126,92,0.15)",
              border: "2px solid rgba(107,126,92,0.25)",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B7E5C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1
            className="font-serif font-light text-3xl sm:text-4xl"
            style={{ color: "#2C3028", letterSpacing: "-0.02em" }}
          >
            {t("Welcome to Mentiva", "Bienvenido a Mentiva")}
          </h1>

          <div
            className="mx-auto rounded-2xl px-6 py-5 backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(44,48,40,0.06)",
              maxWidth: 380,
            }}
          >
            <p
              className="font-sans text-base font-medium"
              style={{ color: "#2C3028", marginBottom: 8 }}
            >
              {t(
                "Your founding membership is confirmed",
                "Tu members\u00eda fundadora est\u00e1 confirmada"
              )}
            </p>
            <p
              className="font-sans text-sm leading-relaxed"
              style={{ color: "#5A6352" }}
            >
              {t(
                "You\u2019re officially one of the first members of Mentiva. Sign in to start turning your vision board into an actionable plan.",
                "Eres oficialmente uno de los primeros miembros de Mentiva. Inicia sesi\u00f3n para empezar a convertir tu vision board en un plan de acci\u00f3n."
              )}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-sans font-semibold text-sm transition-all"
              style={{
                background: "#2C3028",
                color: "rgba(255,255,255,0.92)",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {t("Sign in to get started", "Inicia sesi\u00f3n para comenzar")}{" "}
              {String.fromCharCode(8594)}
            </Link>
          </div>

          <p
            className="font-sans text-xs"
            style={{ color: "#9DA894", marginTop: 16 }}
          >
            {t(
              "Questions? Reach us at mika@mentiva.app",
              "\u00bfPreguntas? Escr\u00edbenos a mika@mentiva.app"
            )}
          </p>
        </div>
      </main>

      <footer
        className="relative z-10 py-6 text-center font-sans text-sm"
        style={{ color: "#9DA894" }}
      >
        {String.fromCharCode(169)} 2026 Mentiva
      </footer>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
