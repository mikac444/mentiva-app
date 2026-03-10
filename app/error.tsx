"use client";

import { useLanguage } from "@/lib/language";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(172deg, #B2C4A0 0%, #C0D4AA 25%, #CCDABC 48%, #D3D0C4 72%, #DAD7CB 100%)" }}
    >
      <div className="text-center space-y-6 animate-[rise_0.8s_ease-out_both]">
        <p
          className="font-serif font-light tracking-[0.35em] uppercase"
          style={{ color: "#9DA894", fontSize: "0.9rem" }}
        >
          MENTIVA
        </p>

        <h1
          className="font-serif font-light text-3xl sm:text-4xl"
          style={{ color: "#2C3028" }}
        >
          {t("Something went wrong", "Algo sali\u00f3 mal")}
        </h1>

        <p
          className="font-sans text-sm max-w-sm mx-auto"
          style={{ color: "#5A6352" }}
        >
          {t(
            "An unexpected error occurred. Please try again.",
            "Ocurri\u00f3 un error inesperado. Por favor intenta de nuevo."
          )}
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-sans font-semibold text-sm transition-colors"
          style={{ background: "#2C3028", color: "rgba(255,255,255,0.92)" }}
        >
          {t("Try Again", "Intentar de Nuevo")}
        </button>
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
