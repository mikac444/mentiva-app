"use client";

type Props = {
  goalText: string;
  progressPercent: number;
  t: (en: string, es: string) => string;
};

export default function NorthStarBar({ goalText, progressPercent, t }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <div style={{
      padding: "0.8rem 1rem",
      background: "rgba(157,180,140,0.08)",
      border: "1px solid rgba(157,180,140,0.15)",
      borderRadius: 14,
      marginBottom: "0.8rem",
    }}>
      {/* Label row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#6B7E5C",
            boxShadow: "0 0 8px rgba(107,126,92,0.4)",
          }} />
          <span style={{
            fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "#6B7E5C",
          }}>
            North Star
          </span>
        </div>
        <span style={{
          fontSize: "0.72rem", fontWeight: 600, color: "#6B7E5C",
        }}>
          {clamped}%
        </span>
      </div>

      {/* Goal text */}
      <p style={{
        fontSize: "0.88rem", fontWeight: 500,
        color: "#2C3028", lineHeight: 1.4,
        marginBottom: 10,
      }}>
        {goalText}
      </p>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 4,
        background: "rgba(107,126,92,0.15)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${clamped}%`,
          background: "linear-gradient(90deg, #6B7E5C, #9DB48C)",
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}
