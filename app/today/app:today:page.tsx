"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { TopNav } from "@/components/TopNav";
import WeeklyPlanner from "@/components/WeeklyPlanner";
import type { User } from "@supabase/supabase-js";

type DailyTask = { id: string; task_text: string; goal_name: string; completed: boolean; date: string };
type VisionGoal = { goal: string; steps: string[] };

function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (lang === "es") return h < 12 ? "Buenos días," : h < 18 ? "Buenas tardes," : "Buenas noches,";
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
}

function getToday(lang: string) {
  return new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getMondayDate(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export default function TodayPage() {
  const { t: t2 } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [hasWeeklyPlan, setHasWeeklyPlan] = useState(false);
  const [visionGoals, setVisionGoals] = useState<VisionGoal[]>([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const router = useRouter();

  const firstName = user?.user_metadata?.full_name?.split(/\s+/)[0] ?? user?.user_metadata?.name?.split(/\s+/)[0] ?? "friend";
  const lang = t2("en", "es");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace("/login"); return; }
      setUser(session.user);

      // Load vision goals from all boards
      supabase.from("vision_boards").select("analysis").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(5)
        .then(({ data: boards }) => {
          const goals: VisionGoal[] = [];
          for (const b of boards ?? []) {
            const a = b.analysis as any;
            if (a?.goalsWithSteps) for (const g of a.goalsWithSteps) {
              if (!goals.find(e => e.goal === g.goal)) goals.push(g);
            }
          }
          setVisionGoals(goals);
        });

      // Check for weekly plan
      supabase.from("weekly_plans").select("id").eq("user_id", session.user.id)
        .eq("week_start", getMondayDate()).single()
        .then(({ data: plan }) => setHasWeeklyPlan(!!plan));

      // Load today's tasks
      loadTasks(session.user.id, session.user.user_metadata?.full_name?.split(/\s+/)[0] || "friend");
    });
  }, [router]);

  async function loadTasks(userId: string, name: string) {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("daily_tasks").select("*")
      .eq("user_id", userId).eq("date", today).order("created_at", { ascending: true });

    if (data && data.length > 0) { setTasks(data); setLoading(false); return; }

    // No tasks — check weekly plan
    const { data: plan } = await supabase.from("weekly_plans").select("*")
      .eq("user_id", userId).eq("week_start", getMondayDate()).single();

    if (plan) {
      setHasWeeklyPlan(true);
      setGeneratingTasks(true);
      try {
        const l = localStorage.getItem("mentiva-lang") || "en";
        const res = await fetch("/api/weekly-plan", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, userName: name, lang: l, focusGoals: plan.focus_goals, context: plan.context, weekStart: getMondayDate() }) });
        const result = await res.json();
        if (result.tasks?.length > 0) setTasks(result.tasks);
      } catch (e) { console.error("Task gen failed:", e); }
      setGeneratingTasks(false);
    } else {
      setShowPlanner(true);
    }
    setLoading(false);
  }

  async function handlePlanComplete(focusGoals: string[], context: Record<string, string>) {
    if (!user) return;
    setShowPlanner(false);
    setGeneratingTasks(true);
    try {
      const l = localStorage.getItem("mentiva-lang") || "en";
      const res = await fetch("/api/weekly-plan", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, userName: firstName, lang: l, focusGoals, context, weekStart: getMondayDate() }) });
      const result = await res.json();
      if (result.tasks?.length > 0) { setTasks(result.tasks); setHasWeeklyPlan(true); }
    } catch (e) { console.error("Plan failed:", e); }
    setGeneratingTasks(false);
  }

  function handlePlanSkip() {
    setShowPlanner(false);
    if (!user) return;
    setGeneratingTasks(true);
    const l = localStorage.getItem("mentiva-lang") || "en";
    fetch("/api/generate-tasks", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, userName: firstName, lang: l }) })
      .then(r => r.json()).then(result => { if (result.tasks) setTasks(result.tasks); })
      .catch(() => {}).finally(() => setGeneratingTasks(false));
  }

  async function toggleTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const nc = !task.completed;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: nc } : t));
    if (nc) { setJustCompleted(taskId); setTimeout(() => setJustCompleted(null), 600); }
    const supabase = createClient();
    await supabase.from("daily_tasks").update({ completed: nc }).eq("id", taskId);
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: nc } : t);
    if (updated.length > 0 && updated.every(t => t.completed)) setTimeout(() => setShowCelebration(true), 600);
  }

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 415;
  const offset = circumference - (circumference * percent) / 100;
  const coreTasks = tasks.slice(0, 3);
  const bonusTasks = tasks.slice(3);

  if (loading) return (
    <div className="min-h-screen bg-mentiva-gradient flex items-center justify-center">
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mentiva-gradient" style={{ paddingBottom: 100 }}>
      <TopNav />
      <div className="px-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center pt-6 pb-2">
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "rgba(255,255,255,0.7)" }}>
            {getGreeting(lang)}
            <span style={{ display: "block", fontSize: "clamp(2rem, 7vw, 2.8rem)", color: "rgba(255,255,255,0.95)", fontWeight: 300, letterSpacing: "-0.03em" }}>
              <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</em>
            </span>
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 30, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "0.6rem" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
            {getToday(lang)}
          </div>
        </div>

        {/* Weekly Planner Flow */}
        {showPlanner && visionGoals.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <WeeklyPlanner goals={visionGoals} userName={firstName} t={t2} onComplete={handlePlanComplete} onSkip={handlePlanSkip} />
          </div>
        )}

        {/* No board uploaded */}
        {!showPlanner && total === 0 && !generatingTasks && visionGoals.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(255,255,255,0.05)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", marginTop: "1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.8rem" }}>✨</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "1.3rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>{t2("No tasks yet", "Aún no hay tareas")}</h3>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.2rem", lineHeight: 1.5 }}>{t2("Upload a vision board and Menti will create your daily action plan.", "Sube un tablero de visión y Menti creará tu plan de acción diario.")}</p>
            <a href="/upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.8rem 1.6rem", background: "white", color: "#4A5C3F", fontWeight: 600, fontSize: "0.9rem", border: "none", borderRadius: 40, textDecoration: "none" }}>{t2("Upload my vision board", "Subir mi tablero de visión")} →</a>
          </div>
        )}

        {/* Generating spinner */}
        {generatingTasks && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,190,140,0.3) 0%, transparent 70%)", margin: "0 auto 1rem", animation: "gentlePulse 1.5s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "1.4rem" }}>✨</span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.5)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              {t2("Menti is creating your tasks...", "Menti está creando tus tareas...")}
            </p>
          </div>
        )}

        {/* Tasks Display */}
        {!showPlanner && !generatingTasks && total > 0 && (
          <>
            {/* Progress ring */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0.8rem 0 1.2rem" }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg viewBox="0 0 160 160" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#C4A86B" }} />
                      <stop offset="100%" style={{ stopColor: "#D4BE8C" }} />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(212,190,140,0.08)" strokeWidth="20" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(offset)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                  <circle cx="80" cy="80" r="66" fill="none" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(offset)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)", filter: "drop-shadow(0 0 8px rgba(212,190,140,0.4))" }} />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.6rem", color: "#D4BE8C", lineHeight: 1 }}>{percent}%</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.15em", marginTop: 2 }}>{t2("complete", "completado")}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
                <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{completed} {t2("of", "de")} {total}</strong> {t2("tasks done", "tareas hechas")}
              </p>
            </div>

            {/* Menti message */}
            <div style={{ margin: "0 0 1.2rem", padding: "1rem 1.2rem", background: "linear-gradient(135deg, rgba(212,190,140,0.08) 0%, rgba(212,190,140,0.02) 100%)", border: "1px solid rgba(212,190,140,0.15)", borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.4rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4BE8C", animation: "gentlePulse 3s ease-in-out infinite" }} />
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#D4BE8C", textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>Menti</div>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                {completed === total && total > 0
                  ? t2("Amazing work today! Every task checked off.", "¡Increíble trabajo hoy! Todas las tareas completadas.")
                  : completed > 0
                  ? t2(`You're making progress — ${total - completed} more to go.`, `Vas progresando — ${total - completed} más por hacer. ¡Tú puedes!`)
                  : t2("Your tasks are ready. Start with whatever feels easiest.", "Tus tareas están listas. Empieza con la que te parezca más fácil.")}
              </p>
            </div>

            {/* Core tasks */}
            <div style={{ fontSize: "0.68rem", color: "#D4BE8C", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🎯</span> {t2("Today's missions", "Misiones de hoy")}
            </div>
            {coreTasks.map((task, i) => (
              <TaskItem key={task.id} task={task} index={i} justCompleted={justCompleted} onToggle={toggleTask} />
            ))}

            {/* Bonus tasks */}
            {bonusTasks.length > 0 && (
              <>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 600, marginTop: "1rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✨</span> {t2("Bonus — if you have time", "Bonus — si te queda tiempo")}
                </div>
                {bonusTasks.map((task, i) => (
                  <TaskItem key={task.id} task={task} index={i + 3} justCompleted={justCompleted} onToggle={toggleTask} />
                ))}
              </>
            )}

            {/* Re-plan / Plan buttons */}
            {hasWeeklyPlan ? (
              <button onClick={() => { setShowPlanner(true); setTasks([]); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "0.7rem", marginTop: "1.2rem", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                🗓 {t2("Re-plan this week", "Re-planificar semana")}
              </button>
            ) : visionGoals.length > 0 ? (
              <div onClick={() => setShowPlanner(true)} style={{ marginTop: "1.2rem", padding: "0.9rem 1rem", background: "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.03) 100%)", border: "1px solid rgba(212,190,140,0.2)", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>🗓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{t2("Plan your week with Menti", "Planifica tu semana con Menti")}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{t2("Get personalized tasks · 2 min", "Obtén tareas personalizadas · 2 min")}</div>
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,190,140,0.12) 0%, transparent 60%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,190,140,0.5) 0%, rgba(212,190,140,0.15) 40%, transparent 65%)", border: "1px solid rgba(212,190,140,0.3)", margin: "0 auto 2rem", boxShadow: "0 0 60px rgba(212,190,140,0.15)" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.2rem", color: "rgba(255,255,255,0.95)", marginBottom: "0.5rem" }}>{t2("You showed up today.", "Hoy te presentaste.")}</h2>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "1rem", color: "rgba(255,255,255,0.5)", maxWidth: 280, lineHeight: 1.5, margin: "0 auto 2rem" }}>{t2("Menti is proud of you.", "Menti está orgullosa de ti.")}</p>
            <button onClick={() => setShowCelebration(false)} style={{ padding: "0.85rem 2rem", background: "white", color: "#4A5C3F", fontWeight: 600, fontSize: "0.88rem", border: "none", borderRadius: 60, cursor: "pointer" }}>{t2("See you tomorrow", "Nos vemos mañana")} →</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes gentlePulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function TaskItem({ task, index, justCompleted, onToggle }: { task: DailyTask; index: number; justCompleted: string | null; onToggle: (id: string) => void }) {
  const isCompleted = task.completed;
  const isJust = justCompleted === task.id;
  return (
    <div onClick={() => onToggle(task.id)} style={{
      display: "flex", alignItems: "flex-start", gap: "0.8rem", padding: "0.9rem 1rem",
      background: isCompleted ? "linear-gradient(135deg, rgba(139,184,138,0.12) 0%, rgba(139,184,138,0.04) 100%)" : "rgba(255,255,255,0.07)",
      border: `1px solid ${isCompleted ? "rgba(139,184,138,0.2)" : "rgba(255,255,255,0.12)"}`,
      borderRadius: 14, marginBottom: "0.4rem", cursor: "pointer",
      transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden",
      animation: `slideIn 0.5s ease ${0.3 + index * 0.07}s both`,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: `2px solid ${isCompleted ? "#8BB88A" : "rgba(255,255,255,0.15)"}`,
        background: isCompleted ? "#8BB88A" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1, transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: isCompleted ? "0 0 10px rgba(139,184,138,0.3)" : "none", position: "relative",
      }}>
        <svg viewBox="0 0 14 14" style={{ width: 12, height: 12, opacity: isCompleted ? 1 : 0, transform: isCompleted ? "scale(1)" : "scale(0.5)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <path d="M2 7L5.5 10.5L12 3.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isJust && <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid #8BB88A", animation: "ripple 0.6s ease forwards" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.88rem", color: isCompleted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.88)", lineHeight: 1.4, fontWeight: 500, textDecoration: isCompleted ? "line-through" : "none", textDecorationColor: "rgba(255,255,255,0.15)", transition: "all 0.4s" }}>{task.task_text}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: "0.3rem", fontSize: "0.68rem", color: isCompleted ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)", fontWeight: 500 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9CAF88", flexShrink: 0 }} />
          {task.goal_name}
        </div>
      </div>
    </div>
  );
}
