"use client";

import { useState } from "react";
import type { GoalWithSteps } from "@/lib/analyze-types";

type Props = {
  goals: GoalWithSteps[];
  suggestedIndex?: number;
  t: (en: string, es: string) => string;
  onSelect: (goalText: string) => void;
  onSkip?: () => void;
};

export default function NorthStarPicker({ goals, suggestedIndex = 0, t, onSelect, onSkip }: Props) {
  const [selected, setSelected] = useState<number | null>(suggestedIndex < goals.length ? suggestedIndex : null);
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  function selectSuggested(i: number) {
    setSelected(i);
    setIsCustom(false);
  }

  function activateCustom() {
    setSelected(null);
    setIsCustom(true);
  }

  const canConfirm = isCustom ? customText.trim().length > 0 : selected !== null;

  function handleConfirm() {
    if (isCustom && customText.trim()) {
      onSelect(customText.trim());
    } else if (selected !== null) {
      onSelect(goals[selected].goal);
    }
  }

  return (
    <div style={{ animation: "slideIn 0.6s ease both" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", margin: "0 auto 1rem",
          background: "rgba(212,190,140,0.15)", border: "1px solid rgba(212,190,140,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#D4BE8C" }} />
        </div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
          fontSize: "clamp(1.4rem, 5vw, 1.9rem)", color: "rgba(255,255,255,0.95)",
          lineHeight: 1.2, marginBottom: "0.4rem",
        }}>
          {t("What's your North Star?", "Cual es tu North Star?")}
        </h2>
        <p style={{
          fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5,
          maxWidth: 320, margin: "0 auto",
        }}>
          {t(
            "Pick the ONE goal that matters most right now. Everything else supports this.",
            "Elige LA meta que mas importa ahora. Todo lo demas apoya esto."
          )}
        </p>
      </div>

      {/* Goal cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {goals.map((g, i) => {
          const isSelected = selected === i && !isCustom;
          const isSuggested = i === suggestedIndex;
          return (
            <button
              key={i}
              onClick={() => selectSuggested(i)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "1rem 1.2rem", textAlign: "left",
                background: isSelected
                  ? "rgba(212,190,140,0.15)"
                  : "rgba(255,255,255,0.05)",
                border: isSelected
                  ? "1.5px solid rgba(212,190,140,0.5)"
                  : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: isSelected
                  ? "2px solid #D4BE8C"
                  : "1.5px solid rgba(255,255,255,0.2)",
                background: isSelected ? "#D4BE8C" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A5C3F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "0.92rem", fontWeight: 500,
                  color: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                  lineHeight: 1.4,
                }}>
                  {g.goal}
                </div>
                {g.area && (
                  <div style={{
                    fontSize: "0.72rem", color: "rgba(255,255,255,0.3)",
                    marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {g.area}
                  </div>
                )}
              </div>

              {/* Suggested badge */}
              {isSuggested && (
                <div style={{
                  position: "absolute", top: -8, right: 12,
                  padding: "2px 10px", borderRadius: 20,
                  background: "rgba(212,190,140,0.2)", border: "1px solid rgba(212,190,140,0.3)",
                  fontSize: "0.65rem", fontWeight: 600,
                  color: "#D4BE8C", letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}>
                  {t("Menti suggests", "Menti sugiere")}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        margin: "1.2rem 0",
      }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
          {t("or", "o")}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* Custom North Star input */}
      <div
        onClick={activateCustom}
        style={{
          padding: "1rem 1.2rem",
          background: isCustom ? "rgba(212,190,140,0.15)" : "rgba(255,255,255,0.05)",
          border: isCustom
            ? "1.5px solid rgba(212,190,140,0.5)"
            : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, cursor: "pointer",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Checkbox */}
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: isCustom
              ? "2px solid #D4BE8C"
              : "1.5px solid rgba(255,255,255,0.2)",
            background: isCustom ? "#D4BE8C" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            {isCustom && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A5C3F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!isCustom ? (
              <div style={{
                fontSize: "0.92rem", fontWeight: 500,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.4,
              }}>
                {t("I have a different goal in mind...", "Tengo otra meta en mente...")}
              </div>
            ) : (
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                autoFocus
                placeholder={t("Write your goal here...", "Escribe tu meta aqui...")}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "rgba(255,255,255,0.95)",
                  fontSize: "0.92rem",
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.4,
                  padding: 0,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            width: "100%", maxWidth: 320,
            padding: "0.9rem 2rem",
            background: canConfirm ? "white" : "rgba(255,255,255,0.1)",
            color: canConfirm ? "#4A5C3F" : "rgba(255,255,255,0.3)",
            fontWeight: 600, fontSize: "0.92rem",
            border: "none", borderRadius: 40, cursor: canConfirm ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.3s",
            opacity: canConfirm ? 1 : 0.6,
          }}
        >
          {t("This is my North Star", "Este es mi North Star")} {String.fromCharCode(8594)}
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              background: "none", border: "none",
              fontSize: "0.8rem", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t("Skip for now", "Omitir por ahora")}
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
