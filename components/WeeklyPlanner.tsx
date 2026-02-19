"use client";
import { useState } from "react";

type Goal = { goal: string; steps: string[]; };
type PlannerProps = {
  goals: Goal[];
  userName: string;
  t: (en: string, es: string) => string;
  onComplete: (focusGoals: string[], context: Record<string, string>) => void;
  onSkip: () => void;
};

const GOAL_EMOJIS: Record<string, string> = {
  business: "💼", negocio: "💼", career: "💼", launch: "💼", lanzar: "💼",
  health: "💪", salud: "💪", fitness: "💪", exercise: "💪",
  relationship: "❤️", relacion: "❤️", love: "❤️", pareja: "❤️",
  finance: "💰", finanzas: "💰", money: "💰", dinero: "💰",
  learning: "📚", aprendizaje: "📚", read: "📚", book: "📚",
  creative: "🎨", creatividad: "🎨",
  routine: "🌅", rutina: "🌅", morning: "🌅", wake: "🌅", despertar: "🌅",
  habit: "🔄", habito: "🔄",
};

function getEmoji(goalName: string): string {
  const lower = goalName.toLowerCase();
  for (const [key, emoji] of Object.entries(GOAL_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "✨";
}

export default function WeeklyPlanner({ goals, userName, t, onComplete, onSkip }: PlannerProps) {
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [contexts, setContexts] = useState<Record<string, string>>({});
  const [currentContext, setCurrentContext] = useState("");

  const contextStepIndex = step - 1;
  const currentGoalForContext = selectedGoals[contextStepIndex];
  const isLastContext = contextStepIndex === selectedGoals.length - 1;
  const totalSteps = 1 + selectedGoals.length + 1;
  const progressWidth = step === 0 ? "10%" : `${Math.min(((step) / (totalSteps - 1)) * 100, 100)}%`;

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : prev.length < 3 ? [...prev, goal] : prev
    );
  }

  function nextFromContext() {
    if (currentContext.trim()) {
      setContexts((prev) => ({ ...prev, [currentGoalForContext]: currentContext.trim() }));
    }
    setCurrentContext("");
    setStep(step + 1);
  }

  function finish() { onComplete(selectedGoals, contexts); }

  return (
    <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column" }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, marginBottom: "1.5rem", overflow: "hidden" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #D4BE8C, #C4A86B)", borderRadius: 3, width: progressWidth, transition: "width 0.5s ease" }} />
      </div>

      {/* Step 0: Goal Selection */}
      {step === 0 && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🗓</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "rgba(255,255,255,0.95)", marginBottom: "0.3rem" }}>
              {t("Let's plan your week,", "Planifiquemos tu semana,")} <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{userName}</em>
            </h2>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              {t("Pick 2-3 goals to focus on. Menti will create your daily plan.", "Elige 2-3 metas. Menti creará tu plan diario.")}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.2rem" }}>
            {goals.map((g) => {
              const selected = selectedGoals.includes(g.goal);
              return (
                <div key={g.goal} onClick={() => toggleGoal(g.goal)} style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.9rem 1rem", background: selected ? "linear-gradient(135deg, rgba(212,190,140,0.15) 0%, rgba(212,190,140,0.05) 100%)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${selected ? "rgba(212,190,140,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.3s ease" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: selected ? "rgba(212,190,140,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{getEmoji(g.goal)}</div>
                  <div style={{ flex: 1, fontSize: "0.88rem", fontWeight: 500, color: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)" }}>{g.goal}</div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected ? "#D4BE8C" : "rgba(255,255,255,0.15)"}`, background: selected ? "#D4BE8C" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected && <svg viewBox="0 0 14 14" style={{ width: 10, height: 10 }}><path d="M2 7L5.5 10.5L12 3.5" fill="none" stroke="#4A5C3F" strokeWidth="2.5" strokeLinecap="round" /></svg>}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedGoals.length > 0 && (
            <button onClick={() => setStep(1)} style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, #D4BE8C, #C4A86B)", color: "#3A4A2F", fontWeight: 700, fontSize: "0.9rem", border: "none", borderRadius: 14, cursor: "pointer", marginBottom: "0.5rem" }}>
              {t("Continue", "Continuar")} →
            </button>
          )}
          <button onClick={onSkip} style={{ width: "100%", padding: "0.7rem", background: "transparent", color: "rgba(255,255,255,0.3)", fontWeight: 500, fontSize: "0.78rem", border: "none", cursor: "pointer" }}>
            {t("Skip for now", "Saltar por ahora")}
          </button>
        </div>
      )}

      {/* Context questions */}
      {step > 0 && step <= selectedGoals.length && (
        <div style={{ animation: "fadeUp 0.4s ease" }} key={`ctx-${contextStepIndex}`}>
          <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{getEmoji(currentGoalForContext)}</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.2rem, 4vw, 1.5rem)", color: "rgba(255,255,255,0.95)", marginBottom: "0.3rem" }}>{currentGoalForContext}</h2>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{t("Where are you with this? What's next?", "¿En qué punto estás? ¿Qué sigue?")}</p>
          </div>
          <div style={{ padding: "1rem 1.2rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.4rem" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4BE8C" }} />
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#D4BE8C", textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>Menti</div>
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "0.92rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              {t(`Tell me about "${currentGoalForContext}" — what do you want to accomplish this week?`, `Cuéntame sobre "${currentGoalForContext}" — ¿qué quieres lograr esta semana?`)}
            </p>
          </div>
          <textarea value={currentContext} onChange={(e) => setCurrentContext(e.target.value)} placeholder={t("e.g. I need to define pricing and send 10 DMs...", "ej. Necesito definir el pricing y enviar 10 DMs...")} style={{ width: "100%", minHeight: 80, padding: "0.9rem 1rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
            <button onClick={() => { setCurrentContext(""); setStep(step - 1); }} style={{ padding: "0.8rem 1.2rem", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, cursor: "pointer" }}>← {t("Back", "Atrás")}</button>
            <button onClick={nextFromContext} style={{ flex: 1, padding: "0.8rem", background: "linear-gradient(135deg, #D4BE8C, #C4A86B)", color: "#3A4A2F", fontWeight: 700, fontSize: "0.85rem", border: "none", borderRadius: 12, cursor: "pointer" }}>
              {isLastContext ? t("Create my plan", "Crear mi plan") + " ✨" : t("Next", "Siguiente") + " →"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {step > selectedGoals.length && (
        <div style={{ animation: "fadeUp 0.4s ease", textAlign: "center", padding: "2rem 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,190,140,0.4) 0%, transparent 70%)", border: "1px solid rgba(212,190,140,0.25)", margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "center", animation: "gentlePulse 2s ease-in-out infinite" }}>
            <span style={{ fontSize: "1.8rem" }}>✨</span>
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.3rem, 5vw, 1.7rem)", color: "rgba(255,255,255,0.95)", marginBottom: "0.5rem" }}>{t("Creating your plan...", "Creando tu plan...")}</h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>{t("Menti is building your personalized tasks.", "Menti está construyendo tus tareas personalizadas.")}</p>
          <AutoFinish onFinish={finish} />
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentlePulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      `}</style>
    </div>
  );
}

function AutoFinish({ onFinish }: { onFinish: () => void }) {
  const [done, setDone] = useState(false);
  if (!done) { setDone(true); setTimeout(onFinish, 500); }
  return null;
}
