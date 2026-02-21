"use client";

import { useState } from "react";
import type { GoalWithSteps } from "@/lib/analyze-types";
import { getEmoji, getEnfoqueColor } from "@/lib/ui-helpers";

type Props = {
  goals: GoalWithSteps[];
  northStarGoal: string;
  t: (en: string, es: string) => string;
  onSelect: (enfoqueNames: string[]) => void;
  onBack?: () => void;
};

export default function EnfoquePicker({ goals, northStarGoal, t, onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customEnfoques, setCustomEnfoques] = useState<string[]>([]);

  // Filter out the North Star from the suggestions (it's already chosen)
  const suggestions = goals
    .filter(g => g.goal !== northStarGoal)
    .map(g => g.area || g.goal.split(" ").slice(0, 3).join(" "));

  // Deduplicate
  const uniqueSuggestions = suggestions.filter((s, i) => suggestions.indexOf(s) === i);

  const totalSelected = selected.length + customEnfoques.length;
  const canAdd = totalSelected < 3;

  function toggleSuggestion(index: number) {
    if (selected.includes(index)) {
      setSelected(prev => prev.filter(i => i !== index));
    } else if (canAdd) {
      setSelected(prev => [...prev, index]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed || !canAdd) return;
    if (customEnfoques.includes(trimmed)) return;
    setCustomEnfoques(prev => [...prev, trimmed]);
    setCustomInput("");
  }

  function removeCustom(name: string) {
    setCustomEnfoques(prev => prev.filter(n => n !== name));
  }

  function handleConfirm() {
    const fromSuggestions = selected.map(i => uniqueSuggestions[i]);
    const all = [...fromSuggestions, ...customEnfoques];
    if (all.length > 0) {
      onSelect(all.slice(0, 3));
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
          fontSize: "clamp(1.3rem, 5vw, 1.7rem)", color: "rgba(255,255,255,0.95)",
          lineHeight: 1.2, marginBottom: "0.4rem",
        }}>
          {t("Choose up to 3 focus areas", "Elige hasta 3 areas de enfoque")}
        </h2>
        <p style={{
          fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5,
          maxWidth: 320, margin: "0 auto",
        }}>
          {t(
            "These are your weekly enfoques — the areas you'll focus on this week.",
            "Estos son tus enfoques semanales — las areas en las que te enfocaras esta semana."
          )}
        </p>
      </div>

      {/* North Star reminder */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0.6rem 1rem", marginBottom: "1rem",
        background: "rgba(212,190,140,0.08)",
        border: "1px solid rgba(212,190,140,0.15)",
        borderRadius: 10,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "#D4BE8C", flexShrink: 0,
        }} />
        <span style={{ fontSize: "0.78rem", color: "rgba(212,190,140,0.7)", fontStyle: "italic" }}>
          North Star: {northStarGoal}
        </span>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem" }}>
        {uniqueSuggestions.map((name, i) => {
          const isSelected = selected.includes(i);
          const color = getEnfoqueColor(i);
          return (
            <button
              key={i}
              onClick={() => toggleSuggestion(i)}
              disabled={!isSelected && !canAdd}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "0.55rem 1rem",
                background: isSelected ? `${color}22` : "rgba(255,255,255,0.05)",
                border: isSelected ? `1.5px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
                borderRadius: 30, cursor: isSelected || canAdd ? "pointer" : "default",
                fontSize: "0.82rem", fontWeight: 500,
                color: isSelected ? color : "rgba(255,255,255,0.6)",
                transition: "all 0.2s",
                opacity: !isSelected && !canAdd ? 0.4 : 1,
              }}
            >
              {getEmoji(name)} {name}
              {isSelected && (
                <span style={{ marginLeft: 2, fontSize: "0.7rem" }}>&#10005;</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom enfoques */}
      {customEnfoques.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.8rem" }}>
          {customEnfoques.map((name, i) => (
            <div
              key={name}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "0.45rem 0.8rem",
                background: `${getEnfoqueColor(uniqueSuggestions.length + i)}22`,
                border: `1px solid ${getEnfoqueColor(uniqueSuggestions.length + i)}`,
                borderRadius: 30, fontSize: "0.8rem", fontWeight: 500,
                color: getEnfoqueColor(uniqueSuggestions.length + i),
              }}
            >
              {name}
              <button
                onClick={() => removeCustom(name)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "inherit", fontSize: "0.7rem", padding: 0, lineHeight: 1,
                }}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom input */}
      {canAdd && (
        <div style={{
          display: "flex", gap: 8, marginBottom: "1.2rem",
        }}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder={t("Add custom focus area...", "Agregar area personalizada...")}
            style={{
              flex: 1, padding: "0.65rem 1rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, color: "white",
              fontSize: "0.85rem", outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            onClick={addCustom}
            disabled={!customInput.trim()}
            style={{
              padding: "0.65rem 1rem",
              background: customInput.trim() ? "rgba(212,190,140,0.2)" : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(212,190,140,0.3)",
              borderRadius: 10, cursor: customInput.trim() ? "pointer" : "default",
              color: "#D4BE8C", fontWeight: 600, fontSize: "0.85rem",
              transition: "all 0.2s",
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Counter */}
      <div style={{
        textAlign: "center", fontSize: "0.75rem",
        color: "rgba(255,255,255,0.3)", marginBottom: "1rem",
      }}>
        {totalSelected}/3 {t("selected", "seleccionados")}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleConfirm}
          disabled={totalSelected === 0}
          style={{
            width: "100%", maxWidth: 320,
            padding: "0.9rem 2rem",
            background: totalSelected > 0 ? "white" : "rgba(255,255,255,0.1)",
            color: totalSelected > 0 ? "#4A5C3F" : "rgba(255,255,255,0.3)",
            fontWeight: 600, fontSize: "0.92rem",
            border: "none", borderRadius: 40,
            cursor: totalSelected > 0 ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.3s",
            opacity: totalSelected > 0 ? 1 : 0.6,
          }}
        >
          {t("Set my enfoques", "Establecer mis enfoques")} {String.fromCharCode(8594)}
        </button>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none",
              fontSize: "0.8rem", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {String.fromCharCode(8592)} {t("Back", "Atras")}
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
