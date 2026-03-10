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
        ? "rgba(107,126,92,0.12)"
        : "rgba(255,255,255,0.05)",
      border: isImpressive
        ? "1px solid rgba(107,126,92,0.25)"
        : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 30,
      marginBottom: "0.6rem",
    }}>
      <span style={{
        display: "inline-block",
        width: 8, height: 8, borderRadius: "50%",
        background: isImpressive ? "#6B7E5C" : "rgba(255,255,255,0.3)",
      }} />
      <span style={{
        fontSize: "0.78rem", fontWeight: 600,
        color: isImpressive ? "#6B7E5C" : "#7E8C74",
        letterSpacing: "0.02em",
      }}>
        {streak} {streak === 1
          ? t("day", "día")
          : t("days", "días")}
      </span>
    </div>
  );
}
