"use client";

import { useState, useRef, useEffect } from "react";
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
  onEdit?: (id: string, newText: string) => void;
  onSwap?: (id: string) => void;
  onDelete?: (id: string) => void;
  swapping?: boolean;
  justCompleted?: boolean;
  autoEdit?: boolean;
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
  onEdit,
  onSwap,
  onDelete,
  swapping,
  justCompleted,
  autoEdit,
}: Props) {
  const config = TASK_TYPE_CONFIG[taskType];
  const typeLabel = lang === "es" ? config.labelEs : config.labelEn;
  const canSwap = taskType !== "non_negotiable" && !completed && onSwap;

  const [editing, setEditing] = useState(autoEdit ?? false);
  const [editText, setEditText] = useState(taskText);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editing, editText.length]);

  function startEdit() {
    if (completed || !onEdit) return;
    setEditText(taskText);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== taskText && onEdit) {
      onEdit(id, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditText(taskText);
    setEditing(false);
  }

  return (
    <div
      style={{
        position: "relative",
        background: completed
          ? "rgba(44,48,40,0.02)"
          : "rgba(44,48,40,0.04)",
        border: completed
          ? "1px solid rgba(44,48,40,0.05)"
          : "1px solid rgba(44,48,40,0.1)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: "0.7rem", color: "#9DA894",
            fontWeight: 500,
          }}>
            {estimatedMinutes} min
          </span>
          {onDelete && !completed && (
            <button
              onClick={() => onDelete(id)}
              style={{
                background: "none", border: "none", padding: "2px",
                cursor: "pointer", display: "flex", alignItems: "center",
                color: "#9DA894",
                transition: "color 0.2s",
              }}
              aria-label={lang === "es" ? "Eliminar tarea" : "Delete task"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
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
              : "1.5px solid rgba(44,48,40,0.25)",
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

        {/* Task text — tap to edit */}
        {editing ? (
          <textarea
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            style={{
              flex: 1, margin: 0, padding: "0 0 4px",
              fontSize: "0.88rem", lineHeight: 1.45,
              color: "#2C3028",
              fontWeight: 400,
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(157,180,140,0.4)",
              outline: "none",
              fontFamily: "inherit",
              resize: "none",
              minHeight: 24,
            }}
            rows={2}
          />
        ) : (
          <p
            onClick={startEdit}
            style={{
              flex: 1, margin: 0,
              fontSize: "0.88rem", lineHeight: 1.45,
              color: completed ? "#9DA894" : "#2C3028",
              textDecoration: completed ? "line-through" : "none",
              fontWeight: 400,
              cursor: !completed && onEdit ? "text" : "default",
            }}
          >
            {taskText || (lang === "es" ? "Toca para escribir tu tarea..." : "Tap to write your task...")}
          </p>
        )}
      </div>

      {/* Bottom row: enfoque + swap */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 10, paddingTop: 8,
        borderTop: "1px solid rgba(44,48,40,0.06)",
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
            fontSize: "0.7rem", color: "#7E8C74",
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
              fontSize: "0.72rem", color: "#9DA894",
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
