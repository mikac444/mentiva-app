"use client";

import { TASK_TYPE_CONFIG } from "@/lib/ui-helpers";

type TaskType = "non_negotiable" | "secondary" | "micro";

type Props = {
  id: string;
  taskText: string;
  taskType: TaskType;
  enfoqueName: string;
  estimatedMinutes: number;
  completed: boolean;
  lang: string;
  onToggle: (id: string) => void;
  onSwap?: (id: string) => void;
  swapping?: boolean;
  justCompleted?: boolean;
};

export default function MissionCard({
  id,
  taskText,
  taskType,
  enfoqueName,
  estimatedMinutes,
  completed,
  lang,
  onToggle,
  onSwap,
  swapping,
  justCompleted,
}: Props) {
  const config = TASK_TYPE_CONFIG[taskType];
  const typeLabel = lang === "es" ? config.labelEs : config.labelEn;
  const canSwap = taskType !== "non_negotiable" && !completed && onSwap;

  return (
    <div
      style={{
        position: "relative",
        background: completed
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.06)",
        border: completed
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderLeft: `3.5px solid ${config.color}`,
        padding: "1rem 1rem 0.8rem",
        transition: "all 0.3s ease",
        opacity: completed ? 0.6 : 1,
        animation: justCompleted ? "completePop 0.4s ease" : undefined,
      }}
    >
      {/* Top row: type label + time */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: config.color,
          opacity: completed ? 0.5 : 0.8,
        }}>
          {typeLabel}
        </span>
        <span style={{
          fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
          fontWeight: 500,
        }}>
          {estimatedMinutes} min
        </span>
      </div>

      {/* Task text + checkbox row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Checkbox */}
        <button
          onClick={() => onToggle(id)}
          style={{
            width: 24, height: 24, minWidth: 24,
            borderRadius: "50%",
            border: completed
              ? `2px solid ${config.color}`
              : "1.5px solid rgba(255,255,255,0.25)",
            background: completed ? config.color : "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
            marginTop: 1,
            padding: 0,
          }}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
        >
          {completed && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Task text */}
        <p style={{
          flex: 1, margin: 0,
          fontSize: "0.88rem", lineHeight: 1.45,
          color: completed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.88)",
          textDecoration: completed ? "line-through" : "none",
          fontWeight: 400,
        }}>
          {taskText}
        </p>
      </div>

      {/* Bottom row: enfoque + swap */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 10, paddingTop: 8,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        {/* Enfoque */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: config.color, opacity: 0.6,
          }} />
          <span style={{
            fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
            fontWeight: 500,
          }}>
            {enfoqueName}
          </span>
        </div>

        {/* Swap button */}
        {canSwap && (
          <button
            onClick={() => onSwap?.(id)}
            disabled={swapping}
            style={{
              background: "none", border: "none",
              fontSize: "0.72rem", color: "rgba(255,255,255,0.25)",
              cursor: swapping ? "wait" : "pointer",
              padding: "2px 6px",
              fontFamily: "'DM Sans', sans-serif",
              transition: "color 0.2s",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            {swapping ? "..." : (lang === "es" ? "Cambiar" : "Swap")}
          </button>
        )}
      </div>

      <style>{`
        @keyframes completePop {
          0% { transform: scale(1); }
          30% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
