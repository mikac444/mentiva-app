"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { TopNav } from "@/components/TopNav";
import WeeklyPlanner from "@/components/WeeklyPlanner";
import type { User } from "@supabase/supabase-js";

type DailyTask = {
  id: string;
  task_text: string;
  goal_name: string;
  completed: boolean;
  date: string;
  is_bonus?: boolean;
};

type Goal = { goal: string; steps: string[] };

type AppState = "loading" | "no-board" | "planner" | "generating" | "tasks";

const GOAL_COLORS: Record<string, string> = {
  default: "#9CAF88",
};

function getGoalColor(goalName: string) {
  return GOAL_COLORS[goalName] ?? GOAL_COLORS.default;
}

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === "es") {
    if (h < 12) return "Buenos días,";
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
    year: "numeric",
  });
}

function getWeekDates(lang: string) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const loc = lang === "es" ? "es-ES" : "en-US";
  const fmt = (d: Date) =>
    d.toLocaleDateString(loc, { month: "short", day: "numeric" });
  return fmt(monday) + " – " + fmt(sunday) + ", " + sunday.getFullYear();
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export default function TodayPage() {
  const { t: t2 } = useLanguage();
  const lang = t2("en", "es");

  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hasWeeklyPlan, setHasWeeklyPlan] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  const firstName =
    user?.user_metadata?.full_name?.split(/\s+/)[0] ??
    user?.user_metadata?.name?.split(/\s+/)[0] ??
    "friend";

  // ─── Load everything on mount ───
  const initialize = useCallback(
    async (userId: string) => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const weekStart = getWeekStart();

      // 1. Check if user has a vision board
      const { data: boards } = await supabase
        .from("vision_boards")
        .select("analysis")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!boards || boards.length === 0) {
        setAppState("no-board");
        return;
      }

      // Extract goals from vision board
      const goalsWithSteps: Goal[] =
        boards[0].analysis?.goalsWithSteps ?? [];
      setGoals(goalsWithSteps);

      // 2. Check if user has a weekly plan for this week
      const { data: weeklyPlan } = await supabase
        .from("weekly_plans")
        .select("id, focus_goals, context")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle();

      // 3. Check if there are tasks for today
      const { data: todayTasks } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .order("created_at", { ascending: true });

      if (weeklyPlan) {
        setHasWeeklyPlan(true);

        if (todayTasks && todayTasks.length > 0) {
          // Has plan + has today's tasks → show them
          setTasks(todayTasks);
          setAppState("tasks");
        } else {
          // Has plan but no today's tasks → generate from plan
          setAppState("generating");
          await generateTasksFromPlan(
            userId,
            weeklyPlan.focus_goals,
            weeklyPlan.context
          );
        }
      } else {
        // No weekly plan → show the planner
        // But first, clear any old tasks from previous sessions
        if (todayTasks && todayTasks.length > 0) {
          await supabase
            .from("daily_tasks")
            .delete()
            .eq("user_id", userId)
            .eq("date", today);
        }
        setHasWeeklyPlan(false);
        setAppState("planner");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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

  // ─── Generate tasks from weekly plan via API ───
  async function generateTasksFromPlan(
    userId: string,
    focusGoals: string[],
    context: Record<string, string>
  ) {
    try {
      const res = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName: firstName,
          focusGoals,
          context,
          lang,
          generateOnly: true, // Flag: plan already saved, just generate tasks
        }),
      });

      const result = await res.json();

      if (result.tasks && result.tasks.length > 0) {
        setTasks(result.tasks);
      } else {
        // Fallback: use the old generation method
        await fallbackGenerateTasks(userId);
      }
    } catch (e) {
      console.error("Task generation from plan failed:", e);
      await fallbackGenerateTasks(userId);
    }
    setAppState("tasks");
  }

  // ─── Fallback task generation (old method) ───
  async function fallbackGenerateTasks(userId: string) {
    try {
      const res = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName: firstName, lang }),
      });
      const result = await res.json();
      if (result.tasks && result.tasks.length > 0) {
        setTasks(result.tasks);
        return;
      }
    } catch (e) {
      console.error("Fallback generation also failed:", e);
    }

    // Last resort: pull from vision board goals directly
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data: boards } = await supabase
      .from("vision_boards")
      .select("analysis")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!boards || boards.length === 0) return;
    const goalsWithSteps: Goal[] =
      boards[0].analysis?.goalsWithSteps ?? [];
    if (goalsWithSteps.length === 0) return;

    const newTasks: {
      user_id: string;
      task_text: string;
      goal_name: string;
      completed: boolean;
      date: string;
    }[] = [];

    for (const g of goalsWithSteps) {
      if (newTasks.length >= 5) break;
      for (const step of g.steps) {
        if (newTasks.length >= 5) break;
        newTasks.push({
          user_id: userId,
          task_text: step,
          goal_name: g.goal,
          completed: false,
          date: today,
        });
      }
    }

    if (newTasks.length === 0) return;
    const { data: inserted } = await supabase
      .from("daily_tasks")
      .insert(newTasks)
      .select();
    if (inserted) setTasks(inserted);
  }

  // ─── WeeklyPlanner callbacks ───
  async function handlePlanComplete(
    focusGoals: string[],
    context: Record<string, string>
  ) {
    if (!user) return;
    setAppState("generating");

    try {
      const res = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userName: firstName,
          focusGoals,
          context,
          lang,
        }),
      });

      const result = await res.json();

      if (result.tasks && result.tasks.length > 0) {
        setTasks(result.tasks);
        setHasWeeklyPlan(true);
      } else {
        // Plan saved but task generation failed — fallback
        setHasWeeklyPlan(true);
        await fallbackGenerateTasks(user.id);
      }
    } catch (e) {
      console.error("Weekly plan submission failed:", e);
      await fallbackGenerateTasks(user.id);
    }

    setAppState("tasks");
  }

  async function handlePlanSkip() {
    if (!user) return;
    setAppState("generating");
    await fallbackGenerateTasks(user.id);
    setAppState("tasks");
  }

  function handleReplan() {
    setHasWeeklyPlan(false);
    setTasks([]);
    setAppState("planner");
  }

  // ─── Toggle task completion ───
  async function toggleTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newCompleted = !task.completed;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: newCompleted } : t
      )
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

    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: newCompleted } : t
    );

    if (
      updatedTasks.length > 0 &&
      updatedTasks.every((t) => t.completed)
    ) {
      setTimeout(() => setShowCelebration(true), 600);
    }
  }

  // ─── Computed values ───
  const coreTasks = tasks.filter((t) => !t.is_bonus);
  const bonusTasks = tasks.filter((t) => t.is_bonus);
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 415;
  const offset = circumference - (circumference * percent) / 100;

  // ─── LOADING STATE ───
  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-mentiva-gradient flex items-center justify-center">
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.9rem",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-mentiva-gradient"
      style={{ paddingBottom: 100 }}
    >
      <TopNav />

      <div className="px-6 max-w-lg mx-auto">
        {/* ─── Header ─── */}
        <div className="text-center pt-6 pb-2">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(1.4rem, 5vw, 1.8rem)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {getGreeting(lang)}
            <span
              style={{
                display: "block",
                fontSize: "clamp(2rem, 7vw, 2.8rem)",
                color: "rgba(255,255,255,0.95)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
              }}
            >
              <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>
                {firstName}
              </em>
            </span>
          </h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 30,
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
              marginTop: "0.6rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.3)",
              }}
            />
            {getToday(lang)}
          </div>
        </div>

        {/* ─── NO VISION BOARD ─── */}
        {appState === "no-board" && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              marginTop: "1.5rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.8rem" }}>
              ✨
            </div>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: "1.3rem",
                color: "rgba(255,255,255,0.8)",
                marginBottom: "0.5rem",
              }}
            >
              {t2("No tasks yet", "Aún no hay tareas")}
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "1.2rem",
                lineHeight: 1.5,
              }}
            >
              {t2(
                "Upload a vision board and Menti will create your daily action plan.",
                "Sube un tablero de visión y Menti creará tu plan de acción diario."
              )}
            </p>
            <a
              href="/upload"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0.8rem 1.6rem",
                background: "white",
                color: "#4A5C3F",
                fontWeight: 600,
                fontSize: "0.9rem",
                border: "none",
                borderRadius: 40,
                textDecoration: "none",
              }}
            >
              {t2("Upload my vision board", "Subir mi tablero de visión")} →
            </a>
          </div>
        )}

        {/* ─── WEEKLY PLANNER FLOW ─── */}
        {appState === "planner" && (
          <div style={{ marginTop: "0.5rem" }}>
            <WeeklyPlanner
              goals={goals}
              userName={firstName}
              t={t2}
              onComplete={handlePlanComplete}
              onSkip={handlePlanSkip}
            />
          </div>
        )}

        {/* ─── GENERATING TASKS ─── */}
        {appState === "generating" && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              marginTop: "1.5rem",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(212,190,140,0.4) 0%, transparent 70%)",
                border: "1px solid rgba(212,190,140,0.25)",
                margin: "0 auto 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "gentlePulse 2s ease-in-out infinite",
              }}
            >
              <span style={{ fontSize: "1.8rem" }}>✨</span>
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: "clamp(1.3rem, 5vw, 1.7rem)",
                color: "rgba(255,255,255,0.95)",
                marginBottom: "0.5rem",
              }}
            >
              {t2("Creating your plan...", "Creando tu plan...")}
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.5,
                maxWidth: 280,
                margin: "0 auto",
              }}
            >
              {t2(
                "Menti is building your personalized tasks.",
                "Menti está construyendo tus tareas personalizadas."
              )}
            </p>
          </div>
        )}

        {/* ─── TASKS VIEW ─── */}
        {appState === "tasks" && (
          <>
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                gap: 4,
                margin: "1.2rem 0",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                padding: 4,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["daily", "weekly"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0",
                    textAlign: "center",
                    borderRadius: 9,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color:
                      tab === t ? "#D4BE8C" : "rgba(255,255,255,0.35)",
                    background:
                      tab === t ? "rgba(255,255,255,0.12)" : "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    letterSpacing: "0.03em",
                    boxShadow:
                      tab === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {t === "daily"
                    ? t2("Today", "Hoy")
                    : t2("This Week", "Esta Semana")}
                </button>
              ))}
            </div>

            {/* ─── DAILY TAB ─── */}
            {tab === "daily" && (
              <div>
                {/* Progress ring */}
                {total > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      margin: "0.8rem 0 1.2rem",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 140,
                        height: 140,
                      }}
                    >
                      <svg
                        viewBox="0 0 160 160"
                        style={{
                          width: "100%",
                          height: "100%",
                          transform: "rotate(-90deg)",
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="goldGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              style={{ stopColor: "#C4A86B" }}
                            />
                            <stop
                              offset="100%"
                              style={{ stopColor: "#D4BE8C" }}
                            />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="80"
                          cy="80"
                          r="66"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="66"
                          fill="none"
                          stroke="rgba(212,190,140,0.12)"
                          strokeWidth="4"
                          strokeDasharray="4,8"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="66"
                          fill="none"
                          stroke="rgba(212,190,140,0.08)"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={String(circumference)}
                          strokeDashoffset={String(offset)}
                          style={{
                            transition:
                              "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)",
                          }}
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="66"
                          fill="none"
                          stroke="url(#goldGrad)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={String(circumference)}
                          strokeDashoffset={String(offset)}
                          style={{
                            transition:
                              "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)",
                            filter:
                              "drop-shadow(0 0 8px rgba(212,190,140,0.4))",
                          }}
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 300,
                            fontSize: "2.6rem",
                            color: "#D4BE8C",
                            lineHeight: 1,
                          }}
                        >
                          {percent}%
                        </div>
                        <div
                          style={{
                            fontSize: "0.62rem",
                            color: "rgba(255,255,255,0.3)",
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.15em",
                            marginTop: 2,
                          }}
                        >
                          {t2("complete", "completado")}
                        </div>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.4)",
                        marginTop: "0.4rem",
                      }}
                    >
                      <strong
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                        }}
                      >
                        {completed} {t2("of", "de")} {total}
                      </strong>{" "}
                      {t2("tasks done", "tareas hechas")}
                    </p>
                  </div>
                )}

                {/* Menti message */}
                {total > 0 && (
                  <div
                    style={{
                      position: "relative",
                      margin: "0 0 1.2rem",
                      padding: "1rem 1.2rem",
                      background:
                        "linear-gradient(135deg, rgba(212,190,140,0.08) 0%, rgba(212,190,140,0.02) 100%)",
                      border: "1px solid rgba(212,190,140,0.15)",
                      borderRadius: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: "0.4rem",
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#D4BE8C",
                          animation:
                            "gentlePulse 3s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#D4BE8C",
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.12em",
                        }}
                      >
                        Menti
                      </div>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontStyle: "italic",
                        fontWeight: 300,
                        fontSize: "0.95rem",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.6,
                      }}
                    >
                      {completed === total && total > 0
                        ? t2(
                            "Amazing work today! Every task checked off.",
                            "¡Increíble trabajo hoy! Todas las tareas completadas."
                          )
                        : completed > 0
                          ? t2(
                              `You're making progress — ${total - completed} more to go. You've got this.`,
                              `Vas progresando — ${total - completed} más por hacer. ¡Tú puedes!`
                            )
                          : t2(
                              "Your tasks are ready. Start with whatever feels easiest.",
                              "Tus tareas están listas. Empieza con la que te parezca más fácil."
                            )}
                    </p>
                  </div>
                )}

                {/* Re-plan button */}
                {hasWeeklyPlan && (
                  <button
                    onClick={handleReplan}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: "100%",
                      padding: "0.6rem",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      marginBottom: "1rem",
                      transition: "all 0.3s",
                    }}
                  >
                    🗓 {t2("Re-plan this week", "Re-planificar semana")}
                  </button>
                )}

                {/* Plan your week banner (if no plan but has tasks from fallback) */}
                {!hasWeeklyPlan && total > 0 && (
                  <button
                    onClick={() => setAppState("planner")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "0.9rem 1rem",
                      background:
                        "linear-gradient(135deg, rgba(212,190,140,0.12) 0%, rgba(212,190,140,0.04) 100%)",
                      border: "1px solid rgba(212,190,140,0.2)",
                      borderRadius: 14,
                      cursor: "pointer",
                      marginBottom: "1rem",
                      transition: "all 0.3s",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>🗓</span>
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "#D4BE8C",
                        }}
                      >
                        {t2(
                          "Plan your week with Menti",
                          "Planifica tu semana con Menti"
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "rgba(255,255,255,0.35)",
                          marginTop: 2,
                        }}
                      >
                        {t2(
                          "Get personalized daily tasks",
                          "Obtén tareas diarias personalizadas"
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.85rem",
                      }}
                    >
                      →
                    </span>
                  </button>
                )}

                {/* Core tasks section */}
                {coreTasks.length > 0 && (
                  <div style={{ marginBottom: "0.6rem" }}>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "rgba(255,255,255,0.25)",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      🎯{" "}
                      {t2("Today's missions", "Misiones de hoy")}
                    </div>
                    {coreTasks.map((task, i) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={i}
                        justCompleted={justCompleted}
                        onToggle={toggleTask}
                      />
                    ))}
                  </div>
                )}

                {/* Bonus tasks section */}
                {bonusTasks.length > 0 && (
                  <div style={{ marginTop: "0.8rem" }}>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "rgba(255,255,255,0.2)",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      ✨ {t2("Bonus", "Bonus")}
                    </div>
                    {bonusTasks.map((task, i) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={i + coreTasks.length}
                        justCompleted={justCompleted}
                        onToggle={toggleTask}
                      />
                    ))}
                  </div>
                )}

                {/* If tasks exist but no core/bonus distinction (old tasks) */}
                {coreTasks.length === 0 &&
                  bonusTasks.length === 0 &&
                  tasks.length > 0 && (
                    <div>
                      {tasks.map((task, i) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={i}
                          justCompleted={justCompleted}
                          onToggle={toggleTask}
                        />
                      ))}
                    </div>
                  )}

                {/* No tasks at all */}
                {total === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 1rem",
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t2(
                      "No tasks for today. Plan your week to get started!",
                      "No hay tareas hoy. ¡Planifica tu semana para empezar!"
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── WEEKLY TAB ─── */}
            {tab === "weekly" && (
              <div>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 300,
                      fontSize: "clamp(1.5rem, 5vw, 2rem)",
                      color: "rgba(255,255,255,0.95)",
                    }}
                  >
                    {t2("Your week in review", "Tu semana en resumen")}
                  </h2>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.35)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {getWeekDates(lang)}
                  </p>
                </div>

                {/* Stats cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    {
                      value: String(completed),
                      label: t2("Tasks done", "Tareas hechas"),
                      sub: t2("today", "hoy"),
                    },
                    {
                      value: percent + "%",
                      label: t2("Completion", "Completado"),
                      sub: t2("today", "hoy"),
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border:
                          "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 16,
                        padding: "1rem",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontFamily:
                            "'Cormorant Garamond', serif",
                          fontWeight: 300,
                          fontSize: "2.2rem",
                          color: "#D4BE8C",
                          lineHeight: 1,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "rgba(255,255,255,0.3)",
                          textTransform:
                            "uppercase" as const,
                          letterSpacing: "0.08em",
                          marginTop: "0.2rem",
                          fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#8BB88A",
                          fontWeight: 600,
                          marginTop: "0.2rem",
                        }}
                      >
                        {s.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress by goal */}
                {tasks.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "rgba(255,255,255,0.25)",
                        textTransform:
                          "uppercase" as const,
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        marginBottom: "0.6rem",
                      }}
                    >
                      {t2("Progress by goal", "Progreso por meta")}
                    </div>
                    {Object.entries(
                      tasks.reduce<
                        Record<
                          string,
                          { done: number; total: number }
                        >
                      >((acc, t) => {
                        if (!acc[t.goal_name])
                          acc[t.goal_name] = {
                            done: 0,
                            total: 0,
                          };
                        acc[t.goal_name].total++;
                        if (t.completed)
                          acc[t.goal_name].done++;
                        return acc;
                      }, {})
                    ).map(
                      ([goal, { done, total: goalTotal }]) => {
                        const goalPercent = Math.round(
                          (done / goalTotal) * 100
                        );
                        const color = getGoalColor(goal);
                        const goalCirc = 107;
                        const goalOff =
                          goalCirc -
                          (goalCirc * goalPercent) / 100;
                        return (
                          <div
                            key={goal}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.8rem",
                              padding: "0.8rem 0.9rem",
                              background:
                                "rgba(255,255,255,0.07)",
                              border:
                                "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 14,
                              marginBottom: "0.4rem",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                                width: 40,
                                height: 40,
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                viewBox="0 0 42 42"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  transform: "rotate(-90deg)",
                                }}
                              >
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="17"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.06)"
                                  strokeWidth="3.5"
                                />
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="17"
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeDasharray={String(
                                    goalCirc
                                  )}
                                  strokeDashoffset={String(
                                    goalOff
                                  )}
                                />
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color:
                                    "rgba(255,255,255,0.85)",
                                }}
                              >
                                {goal}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color:
                                    "rgba(255,255,255,0.35)",
                                  marginTop: "0.1rem",
                                }}
                              >
                                {done} {t2("of", "de")}{" "}
                                {goalTotal}{" "}
                                {t2(
                                  "tasks done",
                                  "tareas hechas"
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "1rem",
                                fontWeight: 700,
                                color,
                                minWidth: 36,
                                textAlign: "right",
                              }}
                            >
                              {goalPercent}%
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Menti's weekly review */}
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.02) 100%)",
                    border:
                      "1px solid rgba(212,190,140,0.2)",
                    borderRadius: 18,
                    padding: "1.2rem",
                    marginTop: "1.2rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: "0.6rem",
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#D4BE8C",
                        animation:
                          "gentlePulse 3s ease-in-out infinite",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#D4BE8C",
                        background:
                          "rgba(212,190,140,0.15)",
                        padding: "3px 10px",
                        borderRadius: 6,
                        letterSpacing: "0.1em",
                        textTransform:
                          "uppercase" as const,
                      }}
                    >
                      {t2(
                        "Menti's Weekly Review",
                        "Resumen Semanal de Menti"
                      )}
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.65,
                    }}
                  >
                    {t2(
                      `Keep showing up, ${firstName}. Consistency matters more than perfection.`,
                      `Sigue apareciendo, ${firstName}. La consistencia importa más que la perfección.`
                    )}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Celebration overlay ─── */}
      {showCelebration && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,190,140,0.12) 0%, transparent 60%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(212,190,140,0.5) 0%, rgba(212,190,140,0.15) 40%, transparent 65%)",
                border: "1px solid rgba(212,190,140,0.3)",
                margin: "0 auto 2rem",
                boxShadow:
                  "0 0 60px rgba(212,190,140,0.15)",
              }}
            />
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: "2.2rem",
                color: "rgba(255,255,255,0.95)",
                marginBottom: "0.5rem",
              }}
            >
              {t2("You showed up today.", "Hoy te presentaste.")}
            </h2>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "1rem",
                color: "rgba(255,255,255,0.5)",
                maxWidth: 280,
                lineHeight: 1.5,
                margin: "0 auto 2rem",
              }}
            >
              {t2(
                "Menti is proud of you.",
                "Menti está orgullosa de ti."
              )}
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                padding: "0.85rem 2rem",
                background: "white",
                color: "#4A5C3F",
                fontWeight: 600,
                fontSize: "0.88rem",
                border: "none",
                borderRadius: 60,
                cursor: "pointer",
              }}
            >
              {t2("See you tomorrow", "Nos vemos mañana")} →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes gentlePulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>
    </div>
  );
}

// ─── Task Card Component ───
function TaskCard({
  task,
  index,
  justCompleted,
  onToggle,
}: {
  task: DailyTask;
  index: number;
  justCompleted: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onToggle(task.id)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.8rem",
        padding: "0.9rem 1rem",
        background: task.completed
          ? "linear-gradient(135deg, rgba(139,184,138,0.12) 0%, rgba(139,184,138,0.04) 100%)"
          : "rgba(255,255,255,0.07)",
        border:
          "1px solid " +
          (task.completed
            ? "rgba(139,184,138,0.2)"
            : "rgba(255,255,255,0.12)"),
        borderRadius: 14,
        marginBottom: "0.4rem",
        cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
        overflow: "hidden",
        animation: `slideIn 0.5s ease ${0.3 + index * 0.07}s both`,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          border:
            "2px solid " +
            (task.completed ? "#8BB88A" : "rgba(255,255,255,0.15)"),
          background: task.completed ? "#8BB88A" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: task.completed
            ? "0 0 10px rgba(139,184,138,0.3)"
            : "none",
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 14 14"
          style={{
            width: 12,
            height: 12,
            opacity: task.completed ? 1 : 0,
            transform: task.completed ? "scale(1)" : "scale(0.5)",
            transition:
              "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <path
            d="M2 7L5.5 10.5L12 3.5"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {justCompleted === task.id && (
          <div
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid #8BB88A",
              animation: "ripple 0.6s ease forwards",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.88rem",
            color: task.completed
              ? "rgba(255,255,255,0.3)"
              : "rgba(255,255,255,0.88)",
            lineHeight: 1.4,
            fontWeight: 500,
            textDecoration: task.completed
              ? "line-through"
              : "none",
            textDecorationColor: "rgba(255,255,255,0.15)",
            transition: "all 0.4s",
          }}
        >
          {task.task_text}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: "0.3rem",
            fontSize: "0.68rem",
            color: task.completed
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.3)",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: getGoalColor(task.goal_name),
              flexShrink: 0,
            }}
          />
          {task.goal_name}
        </div>
      </div>
    </div>
  );
}