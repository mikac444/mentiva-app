"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

export default function UnauthorizedPage() {
  const { t } = useLanguage();

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
            {t("Mentiva is in early access", "Mentiva est\u00e1 en acceso anticipado")}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            {t(
              "This app is currently available to founding members only. Join us and turn your vision board into an actionable plan with AI-powered mentoring.",
              "Esta app est\u00e1 disponible solo para miembros fundadores. \u00danete y convierte tu vision board en un plan de acci\u00f3n con mentor\u00eda de IA."
            )}
          </p>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
            {t("$10 lifetime founding membership", "Membres\u00eda fundadora de por vida por $10")}
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg font-semibold py-3 px-4 text-center transition-colors hover:opacity-90"
              style={{ background: "#FFFFFF", color: "#4A5C3F" }}
            >
              {t("Become a founding member", "Hazte miembro fundador")}
            </a>
            <a
              href="mailto:mika@mentiva.app"
              className="text-sm transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {t("Already a member? Contact us", "\u00bfYa eres miembro? Cont\u00e1ctanos")}
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
          {t("Sign out", "Cerrar sesi\u00f3n")}
        </button>
      </div>
    </div>
  );
}
