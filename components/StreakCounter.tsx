"use client";

type Props = {
  streak: number;
  t: (en: string, es: string) => string;
};

export default function StreakCounter({ streak, t }: Props) {
  if (streak <= 0) return null;

  const isImpressive = streak >= 7;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "0.35rem 0.9rem",
      background: isImpressive
        ? "rgba(212,190,140,0.12)"
        : "rgba(255,255,255,0.05)",
      border: isImpressive
        ? "1px solid rgba(212,190,140,0.25)"
        : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 30,
      marginBottom: "0.6rem",
    }}>
      <span style={{
        fontSize: "0.85rem",
        filter: isImpressive ? "none" : "grayscale(0.5)",
      }}>
        {isImpressive ? "\u{1F525}" : "\u{1F525}"}
      </span>
      <span style={{
        fontSize: "0.78rem", fontWeight: 600,
        color: isImpressive ? "#D4BE8C" : "rgba(255,255,255,0.5)",
        letterSpacing: "0.02em",
      }}>
        {streak} {streak === 1
          ? t("day", "dia")
          : t("days", "dias")}
      </span>
    </div>
  );
}
