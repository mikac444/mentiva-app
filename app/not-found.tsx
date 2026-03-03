"use client";

import { useLanguage } from "@/lib/language";
import Link from "next/link";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #A1B392 0%, #6B7F5E 100%)" }}
    >
      <div className="text-center space-y-6 animate-[rise_0.8s_ease-out_both]">
        <p
          className="font-serif font-light tracking-[0.35em] uppercase"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}
        >
          MENTIVA
        </p>

        <h1
          className="font-serif font-light text-6xl sm:text-7xl"
          style={{ color: "#D4BE8C" }}
        >
          404
        </h1>

        <p
          className="font-serif font-light text-xl"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {t("This page doesn\u2019t exist.", "Esta p\u00e1gina no existe.")}
        </p>

        <p
          className="font-sans text-sm max-w-sm mx-auto"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          {t(
            "The page you\u2019re looking for may have been moved or no longer exists.",
            "La p\u00e1gina que buscas pudo haber sido movida o ya no existe."
          )}
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#4A5C3F] font-sans font-semibold text-sm hover:bg-white/90 transition-colors"
        >
          {t("Go to Dashboard", "Ir al Dashboard")} {String.fromCharCode(8594)}
        </Link>
      </div>

      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
