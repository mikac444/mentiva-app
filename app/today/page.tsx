"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { TopNav } from "@/components/TopNav";
import NorthStarBar from "@/components/NorthStarBar";
import StreakCounter from "@/components/StreakCounter";
import MissionCard from "@/components/MissionCard";
import ProgressTab from "@/components/ProgressTab";
import NorthStarPicker from "@/components/NorthStarPicker";
import EnfoquePicker from "@/components/EnfoquePicker";
import type { User } from "@supabase/supabase-js";
import type { MissionTask, GoalWithSteps } from "@/lib/analyze-types";

type AppState =
  | "loading"
  | "no-board"
  | "no-north-star"
  | "no-enfoques"
  | "generating"
  | "missions";

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === "es") {
    if (h < 12) return "Buenos dias,";
    if (h < 18) return "Buenas tardes,";
    return "Buenas noches,";
  }
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

function getToday(lang: string) {
  return new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const { t, lang: langRaw } = useLanguage();
  const lang = t("en", "es");

  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [tab, setTab] = useState<"today" | "progress">("today");

  // Mission data
  const [missions, setMissions] = useState<MissionTask[]>([]);
  const [motivationalPulse, setMotivationalPulse] = useState("");
  const [streak, setStreak] = useState(0);

  // North Star data
  const [northStarGoal, setNorthStarGoal] = useState("");
  const [northStarProgress, setNorthStarProgress] = useState(0);

  // Board goals (for pickers)
  const [boardGoals, setBoardGoals] = useState<GoalWithSteps[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);

  // UI state
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const router = useRouter();

  const firstName =
    user?.user_metadata?.full_name?.split(/\s+/)[0] ??
    user?.user_metadata?.name?.split(/\s+/)[0] ??
    "friend";

  // ─── Initialize ───
  const initialize = useCallback(async (userId: string) => {
    const supabase = createClient();

    // 1. Check if user has a vision board
    const { data: boards } = await supabase
      .from("vision_boards")
      .select("id, analysis")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!boards || boards.length === 0) {
      setAppState("no-board");
      return;
    }

    const board = boards[0];
    const goalsWithSteps: GoalWithSteps[] = board.analysis?.goalsWithSteps ?? [];
    setBoardGoals(goalsWithSteps);
    setBoardId(board.id);

    // 2. Check if user has a North Star
    try {
      const nsRes = await fetch("/api/north-star");
      const nsData = await nsRes.json();

      if (!nsData.northStar) {
        setAppState("no-north-star");
        return;
      }

      setNorthStarGoal(nsData.northStar.goal_text);

      // 3. Check if user has enfoques for this week
      const enfRes = await fetch("/api/enfoques");
      const enfData = await enfRes.json();

      if (!enfData.enfoques || enfData.enfoques.length === 0) {
        setAppState("no-enfoques");
        return;
      }

      // 4. Generate or fetch missions
      await loadMissions(false);

    } catch (err) {
      console.error("Init error:", err);
      setAppState("no-north-star");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function loadMissions(forceRegenerate: boolean) {
    setAppState("generating");

    try {
      const res = await fetch("/api/generate-missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, forceRegenerate }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Mission generation failed:", data.error);
        setAppState("missions");
        return;
      }

      setMissions(data.missions || []);
      setStreak(data.streak || 0);
      if (data.motivational_pulse) {
        setMotivationalPulse(data.motivational_pulse);
      }

      // Compute North Star progress (monthly)
      const supabase = createClient();
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: monthStreaks } = await supabase
        .from("streaks")
        .select("date, non_negotiable_completed")
        .eq("user_id", user?.id || "")
        .gte("date", monthStart.toISOString().split("T")[0])
        .lte("date", today.toISOString().split("T")[0]);

      const daysElapsed = Math.max(1, today.getDate());
      const nnDone = (monthStreaks ?? []).filter(
        (s: { non_negotiable_completed: boolean }) => s.non_negotiable_completed
      ).length;
      setNorthStarProgress(Math.round((nnDone / daysElapsed) * 100));

      setAppState("missions");
    } catch (err) {
      console.error("Load missions error:", err);
      setAppState("missions");
    }
  }

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
      initialize(session.user.id);
    });
  }, [router, initialize]);

  // Language change detection — regenerate if needed
  useEffect(() => {
    if (appState !== "missions" || missions.length === 0) return;
    const missionLang = (missions[0] as MissionTask & { lang?: string })?.lang;
    if (missionLang && missionLang !== lang) {
      loadMissions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ─── Toggle task completion ───
  async function toggleTask(taskId: string) {
    const task = missions.find((m) => m.id === taskId);
    if (!task) return;
    const newCompleted = !task.completed;

    // Optimistic update
    setMissions((prev) =>
      prev.map((m) => (m.id === taskId ? { ...m, completed: newCompleted } : m))
    );

    if (newCompleted) {
      setJustCompleted(taskId);
      setTimeout(() => setJustCompleted(null), 600);
    }

    const supabase = createClient();
    await supabase
      .from("daily_tasks")
      .update({ completed: newCompleted })
      .eq("id", taskId);

    // If non-negotiable, update streak
    if (task.task_type === "non_negotiable") {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("streaks")
        .upsert({
          user_id: user?.id,
          date: today,
          non_negotiable_completed: newCompleted,
        }, { onConflict: "user_id,date" });

      if (newCompleted) {
        setStreak((prev) => prev + 1);
      } else {
        setStreak((prev) => Math.max(0, prev - 1));
      }
    }

    // Check if all missions completed
    const updatedMissions = missions.map((m) =>
      m.id === taskId ? { ...m, completed: newCompleted } : m
    );
    if (updatedMissions.every((m) => m.completed)) {
      setTimeout(() => setShowCelebration(true), 600);
    }
  }

  // ─── Swap task ───
  async function swapTask(taskId: string) {
    if (swappingId) return;
    setSwappingId(taskId);

    try {
      const res = await fetch("/api/swap-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, lang }),
      });
      const data = await res.json();

      if (res.ok && data.task) {
        setMissions((prev) =>
          prev.map((m) => (m.id === taskId ? { ...m, ...data.task } : m))
        );
      }
    } catch (err) {
      console.error("Swap failed:", err);
    } finally {
      setSwappingId(null);
    }
  }

  // ─── North Star selection (from Today page picker) ───
  async function handleNorthStarSelect(goalText: string) {
    try {
      await fetch("/api/north-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText, sourceBoardId: boardId }),
      });
      setNorthStarGoal(goalText);
      setAppState("no-enfoques");
    } catch (err) {
      console.error("Failed to save North Star:", err);
    }
  }

  // ─── Enfoques selection (from Today page picker) ───
  async function handleEnfoquesSelect(enfoqueNames: string[]) {
    try {
      // Get North Star ID first
      const nsRes = await fetch("/api/north-star");
      const nsData = await nsRes.json();
      const northStarId = nsData.northStar?.id;

      await fetch("/api/enfoques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enfoqueNames, northStarId }),
      });

      // Now generate missions
      await loadMissions(false);
    } catch (err) {
      console.error("Failed to save enfoques:", err);
    }
  }

  // ─── Computed ───
  const completed = missions.filter((m) => m.completed).length;
  const total = missions.length;

  // ─── LOADING ───
  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-mentiva-gradient flex items-center justify-center">
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C",
          animation: "gentlePulse 2s ease-in-out infinite",
        }} />
        <style>{`@keyframes gentlePulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mentiva-gradient" style={{ paddingBottom: 100 }}>
      <TopNav />

      <div className="px-6 max-w-lg mx-auto">
        {/* ─── Header ─── */}
        <div className="text-center pt-6 pb-2">
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "rgba(255,255,255,0.7)",
          }}>
            {getGreeting(lang)}
            <span style={{
              display: "block", fontSize: "clamp(2rem, 7vw, 2.8rem)",
              color: "rgba(255,255,255,0.95)", fontWeight: 300, letterSpacing: "-0.03em",
            }}>
              <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</em>
            </span>
          </h1>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 30,
            fontSize: "0.72rem", color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "0.6rem",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
            {getToday(lang)}
          </div>
        </div>

        {/* ─── NO BOARD ─── */}
        {appState === "no-board" && (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "rgba(255,255,255,0.05)", borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)", marginTop: "1.5rem",
          }}>
            <div style={{ marginBottom: "0.8rem", display: "flex", justifyContent: "center" }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#D4BE8C" }} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "1.3rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem",
            }}>
              {t("Start your journey", "Comienza tu camino")}
            </h3>
            <p style={{
              fontSize: "0.85rem", color: "rgba(255,255,255,0.4)",
              marginBottom: "1.2rem", lineHeight: 1.5,
            }}>
              {t(
                "Upload a vision board and Menti will create your personalized mission plan.",
                "Sube un tablero de vision y Menti creara tu plan de misiones personalizado."
              )}
            </p>
            <a href="/upload" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.8rem 1.6rem", background: "white", color: "#4A5C3F",
              fontWeight: 600, fontSize: "0.9rem", border: "none", borderRadius: 40,
              textDecoration: "none",
            }}>
              {t("Upload my vision board", "Subir mi tablero de vision")} {String.fromCharCode(8594)}
            </a>
          </div>
        )}

        {/* ─── NO NORTH STAR (Picker) ─── */}
        {appState === "no-north-star" && boardGoals.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <NorthStarPicker
              goals={boardGoals}
              suggestedIndex={0}
              t={t}
              onSelect={handleNorthStarSelect}
            />
          </div>
        )}

        {/* ─── NO ENFOQUES (Picker) ─── */}
        {appState === "no-enfoques" && boardGoals.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <EnfoquePicker
              goals={boardGoals}
              northStarGoal={northStarGoal}
              t={t}
              onSelect={handleEnfoquesSelect}
              onBack={() => setAppState("no-north-star")}
            />
          </div>
        )}

        {/* ─── GENERATING ─── */}
        {appState === "generating" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", marginTop: "1.5rem" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(212,190,140,0.4) 0%, transparent 70%)",
              border: "1px solid rgba(212,190,140,0.25)",
              margin: "0 auto 1.5rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "gentlePulse 2s ease-in-out infinite",
            }}>
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#D4BE8C" }} />
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.3rem, 5vw, 1.7rem)", color: "rgba(255,255,255,0.95)",
              marginBottom: "0.5rem",
            }}>
              {t("Preparing your missions...", "Preparando tus misiones...")}
            </h2>
            <p style={{
              fontSize: "0.82rem", color: "rgba(255,255,255,0.4)",
              lineHeight: 1.5, maxWidth: 280, margin: "0 auto",
            }}>
              {t(
                "Menti is creating your personalized daily missions.",
                "Menti esta creando tus misiones diarias personalizadas."
              )}
            </p>
          </div>
        )}

        {/* ─── MISSIONS VIEW ─── */}
        {appState === "missions" && (
          <>
            {/* North Star bar */}
            {northStarGoal && (
              <div style={{ marginTop: "1rem" }}>
                <NorthStarBar
                  goalText={northStarGoal}
                  progressPercent={northStarProgress}
                  t={t}
                />
              </div>
            )}

            {/* Streak */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.4rem" }}>
              <StreakCounter streak={streak} t={t} />
            </div>

            {/* Tab switcher */}
            <div style={{
              display: "flex", gap: 4, margin: "0.6rem 0 1rem",
              background: "rgba(255,255,255,0.05)", borderRadius: 12,
              padding: 4, border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {(["today", "progress"] as const).map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => setTab(tabName)}
                  style={{
                    flex: 1, padding: "0.55rem 0", textAlign: "center",
                    borderRadius: 9, fontSize: "0.8rem", fontWeight: 600,
                    color: tab === tabName ? "#D4BE8C" : "rgba(255,255,255,0.35)",
                    background: tab === tabName ? "rgba(255,255,255,0.12)" : "none",
                    border: "none", cursor: "pointer", transition: "all 0.3s",
                    letterSpacing: "0.03em",
                    boxShadow: tab === tabName ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {tabName === "today"
                    ? t("Today", "Hoy")
                    : t("Progress", "Progreso")}
                </button>
              ))}
            </div>

            {/* ─── TODAY TAB ─── */}
            {tab === "today" && (
              <div>
                {/* Mission cards */}
                {missions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {missions.map((m) => (
                      <MissionCard
                        key={m.id}
                        id={m.id}
                        taskText={m.task_text}
                        taskType={m.task_type}
                        enfoqueName={m.enfoque_name}
                        estimatedMinutes={m.estimated_minutes}
                        completed={m.completed}
                        lang={lang}
                        onToggle={toggleTask}
                        onSwap={swapTask}
                        swapping={swappingId === m.id}
                        justCompleted={justCompleted === m.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: "center", padding: "2rem 1rem",
                    color: "rgba(255,255,255,0.35)", fontSize: "0.85rem",
                  }}>
                    {t(
                      "No missions for today. Check back soon!",
                      "No hay misiones hoy. Vuelve pronto!"
                    )}
                  </div>
                )}

                {/* Motivational pulse */}
                {motivationalPulse && (
                  <div style={{
                    position: "relative", margin: "1.2rem 0",
                    padding: "1rem 1.2rem",
                    background: "linear-gradient(135deg, rgba(212,190,140,0.08) 0%, rgba(212,190,140,0.02) 100%)",
                    border: "1px solid rgba(212,190,140,0.15)", borderRadius: 16,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: "0.4rem",
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#D4BE8C",
                        animation: "gentlePulse 3s ease-in-out infinite",
                      }} />
                      <div style={{
                        fontSize: "0.7rem", fontWeight: 700, color: "#D4BE8C",
                        textTransform: "uppercase" as const, letterSpacing: "0.12em",
                      }}>
                        Menti
                      </div>
                    </div>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                      fontWeight: 300, fontSize: "0.95rem",
                      color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
                    }}>
                      {motivationalPulse}
                    </p>
                  </div>
                )}

                {/* Summary */}
                {total > 0 && (
                  <div style={{
                    textAlign: "center", fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.25)", marginTop: "0.5rem",
                  }}>
                    {completed}/{total} {t("completed", "completadas")}
                  </div>
                )}
              </div>
            )}

            {/* ─── PROGRESS TAB ─── */}
            {tab === "progress" && user && (
              <ProgressTab
                userId={user.id}
                northStarGoal={northStarGoal}
                t={t}
                currentStreak={streak}
              />
            )}
          </>
        )}
      </div>

      {/* ─── Celebration overlay ─── */}
      {showCelebration && (
        <div
          onClick={() => setShowCelebration(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{
            textAlign: "center", padding: "2rem",
            animation: "celebPop 0.5s ease",
          }}>
            <div style={{
              fontSize: "3rem", marginBottom: "1rem",
              animation: "celebBounce 0.6s ease",
            }}>
              {String.fromCodePoint(0x1F389)}
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)", color: "#D4BE8C",
              marginBottom: "0.5rem",
            }}>
              {t("All missions complete!", "Todas las misiones completadas!")}
            </h2>
            <p style={{
              fontSize: "0.85rem", color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5, maxWidth: 280, margin: "0 auto",
            }}>
              {t(
                "You did it. Another day closer to your North Star.",
                "Lo lograste. Un dia mas cerca de tu North Star."
              )}
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                marginTop: "1.5rem", padding: "0.7rem 2rem",
                background: "rgba(212,190,140,0.2)", border: "1px solid rgba(212,190,140,0.3)",
                borderRadius: 30, color: "#D4BE8C", fontSize: "0.85rem",
                fontWeight: 600, cursor: "pointer",
              }}
            >
              {t("Continue", "Continuar")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gentlePulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes celebPop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes celebBounce { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
