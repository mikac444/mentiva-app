"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type DailyTask = {
  id: string;
  task_text: string;
  goal_name: string;
  completed: boolean;
  date: string;
};

const GOAL_COLORS: Record<string, string> = {
  default: "#9CAF88",
};

function getGoalColor(goalName: string) {
  return GOAL_COLORS[goalName] ?? GOAL_COLORS.default;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

function getToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return fmt(monday) + " - " + fmt(sunday) + ", " + sunday.getFullYear();
}

const headerStyle = {
  background: "rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
};

export default function TodayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace("/login"); return; }
      setUser(session.user);
      loadTasks(session.user.id);
    });
  }, [router]);

  async function loadTasks(userId: string) {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("daily_tasks").select("*").eq("user_id", userId).eq("date", today).order("created_at", { ascending: true });
    if (data && data.length > 0) { setTasks(data); }
    else { await generateTasksFromGoals(userId, today); }
    setLoading(false);
  }

  async function generateTasksFromGoals(userId: string, date: string) {
    const supabase = createClient();
    const { data: boards } = await supabase.from("vision_boards").select("analysis").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    if (!boards || boards.length === 0) { setTasks([]); return; }
    const goalsWithSteps = boards[0].analysis?.goalsWithSteps ?? [];
    if (goalsWithSteps.length === 0) { setTasks([]); return; }
    const newTasks: { user_id: string; task_text: string; goal_name: string; completed: boolean; date: string }[] = [];
    for (const g of goalsWithSteps) {
      if (newTasks.length >= 5) break;
      for (const step of g.steps) {
        if (newTasks.length >= 5) break;
        newTasks.push({ user_id: userId, task_text: step, goal_name: g.goal, completed: false, date });
      }
    }
    if (newTasks.length === 0) return;
    const { data: inserted } = await supabase.from("daily_tasks").insert(newTasks).select();
    if (inserted) setTasks(inserted);
  }

  async function toggleTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)));
    if (newCompleted) { setJustCompleted(taskId); setTimeout(() => setJustCompleted(null), 600); }
    const supabase = createClient();
    await supabase.from("daily_tasks").update({ completed: newCompleted }).eq("id", taskId);
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t));
    if (updatedTasks.length > 0 && updatedTasks.every((t) => t.completed)) {
      setTimeout(() => setShowCelebration(true), 600);
    }
  }

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 415;
  const offset = circumference - (circumference * percent) / 100;
  const firstName = user?.user_metadata?.full_name?.split(/\s+/)[0] ?? user?.user_metadata?.name?.split(/\s+/)[0] ?? "friend";

  if (loading) {
    return (<div className="min-h-screen bg-mentiva-gradient flex items-center justify-center"><div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading...</div></div>);
  }

  return (
    <div className="min-h-screen bg-mentiva-gradient" style={{ paddingBottom: 100 }}>
      <header className="px-4 py-4" style={headerStyle}>
        <span style={{ fontFamily: "serif", fontWeight: 300, fontSize: "1.1rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.3em", textTransform: "uppercase" }}>Mentiva</span>
      </header>

      <div className="px-6 max-w-lg mx-auto">
        <div className="text-center pt-6 pb-2">
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "rgba(255,255,255,0.7)" }}>
            {getGreeting()}
            <span style={{ display: "block", fontSize: "clamp(2rem, 7vw, 2.8rem)", color: "rgba(255,255,255,0.95)", fontWeight: 300, letterSpacing: "-0.03em" }}>
              <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</em>
            </span>
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 30, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "0.6rem" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
            {getToday()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, margin: "1.2rem 0", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["daily", "weekly"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "0.55rem 0", textAlign: "center", borderRadius: 9, fontSize: "0.8rem", fontWeight: 600, color: tab === t ? "#D4BE8C" : "rgba(255,255,255,0.35)", background: tab === t ? "rgba(255,255,255,0.12)" : "none", border: "none", cursor: "pointer", transition: "all 0.3s", letterSpacing: "0.03em", boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }}>
              {t === "daily" ? "Today" : "This Week"}
            </button>
          ))}
        </div>

        {tab === "daily" && (
          <div>
            {total > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0.8rem 0 1.2rem" }}>
                <div style={{ position: "relative", width: 140, height: 140 }}>
                  <svg viewBox="0 0 160 160" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{ stopColor: "#C4A86B" }} /><stop offset="100%" style={{ stopColor: "#D4BE8C" }} /></linearGradient></defs>
                    <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(212,190,140,0.12)" strokeWidth="4" strokeDasharray="4,8" />
                    <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(212,190,140,0.08)" strokeWidth="20" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(offset)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                    <circle cx="80" cy="80" r="66" fill="none" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(offset)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)", filter: "drop-shadow(0 0 8px rgba(212,190,140,0.4))" }} />
                  </svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.6rem", color: "#D4BE8C", lineHeight: 1 }}>{percent}%</div>
                    <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.15em", marginTop: 2 }}>complete</div>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
                  <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{completed} of {total}</strong> tasks done
                </p>
              </div>
            )}

            {total > 0 && (
              <div style={{ position: "relative", margin: "0 0 1.2rem", padding: "1rem 1.2rem", background: "linear-gradient(135deg, rgba(212,190,140,0.08) 0%, rgba(212,190,140,0.02) 100%)", border: "1px solid rgba(212,190,140,0.15)", borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.4rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4BE8C", animation: "gentlePulse 3s ease-in-out infinite" }} />
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#D4BE8C", textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>Menti</div>
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  {completed === total && total > 0 ? "Amazing work today! Every task checked off." : completed > 0 ? "You're making progress — " + (total - completed) + " more to go. You've got this." : "Your tasks are ready. Start with whatever feels easiest."}
                </p>
              </div>
            )}

            {total === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(255,255,255,0.05)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.8rem" }}>&#10024;</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "1.3rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>No tasks yet</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.2rem", lineHeight: 1.5 }}>Upload a vision board and Menti will create your daily action plan.</p>
                <a href="/upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.8rem 1.6rem", background: "white", color: "#4A5C3F", fontWeight: 600, fontSize: "0.9rem", border: "none", borderRadius: 40, textDecoration: "none" }}>Upload my vision board &#8594;</a>
              </div>
            )}

            <div>
              {tasks.map((task, i) => (
                <div key={task.id} onClick={() => toggleTask(task.id)} style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", padding: "0.9rem 1rem", background: task.completed ? "linear-gradient(135deg, rgba(139,184,138,0.12) 0%, rgba(139,184,138,0.04) 100%)" : "rgba(255,255,255,0.07)", border: "1px solid " + (task.completed ? "rgba(139,184,138,0.2)" : "rgba(255,255,255,0.12)"), borderRadius: 14, marginBottom: "0.4rem", cursor: "pointer", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden", animation: "slideIn 0.5s ease " + (0.3 + i * 0.07) + "s both" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid " + (task.completed ? "#8BB88A" : "rgba(255,255,255,0.15)"), background: task.completed ? "#8BB88A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: task.completed ? "0 0 10px rgba(139,184,138,0.3)" : "none", position: "relative" }}>
                    <svg viewBox="0 0 14 14" style={{ width: 12, height: 12, opacity: task.completed ? 1 : 0, transform: task.completed ? "scale(1)" : "scale(0.5)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                      <path d="M2 7L5.5 10.5L12 3.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {justCompleted === task.id && (<div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid #8BB88A", animation: "ripple 0.6s ease forwards" }} />)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.88rem", color: task.completed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.88)", lineHeight: 1.4, fontWeight: 500, textDecoration: task.completed ? "line-through" : "none", textDecorationColor: "rgba(255,255,255,0.15)", transition: "all 0.4s" }}>{task.task_text}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: "0.3rem", fontSize: "0.68rem", color: task.completed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: getGoalColor(task.goal_name), flexShrink: 0 }} />
                      {task.goal_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "weekly" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.5rem, 5vw, 2rem)", color: "rgba(255,255,255,0.95)" }}>Your week in review</h2>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginTop: "0.2rem" }}>{getWeekDates()}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {[{ value: String(completed), label: "Tasks done", sub: "today" }, { value: percent + "%", label: "Completion", sub: "today" }].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.2rem", color: "#D4BE8C", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginTop: "0.2rem", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "#8BB88A", fontWeight: 600, marginTop: "0.2rem" }}>{s.sub}</div>
                </div>
              ))}
            </div>
            {tasks.length > 0 && (
              <div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600, marginBottom: "0.6rem" }}>Progress by goal</div>
                {Object.entries(tasks.reduce<Record<string, { done: number; total: number }>>((acc, t) => { if (!acc[t.goal_name]) acc[t.goal_name] = { done: 0, total: 0 }; acc[t.goal_name].total++; if (t.completed) acc[t.goal_name].done++; return acc; }, {})).map(([goal, { done, total: goalTotal }]) => {
                  const goalPercent = Math.round((done / goalTotal) * 100);
                  const color = getGoalColor(goal);
                  const goalCirc = 107;
                  const goalOff = goalCirc - (goalCirc * goalPercent) / 100;
                  return (
                    <div key={goal} style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, marginBottom: "0.4rem" }}>
                      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                        <svg viewBox="0 0 42 42" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                          <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                          <circle cx="21" cy="21" r="17" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={String(goalCirc)} strokeDashoffset={String(goalOff)} />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{goal}</div>
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "0.1rem" }}>{done} of {goalTotal} tasks done</div>
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{goalPercent}%</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ background: "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.02) 100%)", border: "1px solid rgba(212,190,140,0.2)", borderRadius: 18, padding: "1.2rem", marginTop: "1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4BE8C", animation: "gentlePulse 3s ease-in-out infinite" }} />
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#D4BE8C", background: "rgba(212,190,140,0.15)", padding: "3px 10px", borderRadius: 6, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Menti&apos;s Weekly Review</div>
              </div>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>Keep showing up, {firstName}. Consistency matters more than perfection.</p>
            </div>
          </div>
        )}
      </div>

      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,190,140,0.12) 0%, transparent 60%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,190,140,0.5) 0%, rgba(212,190,140,0.15) 40%, transparent 65%)", border: "1px solid rgba(212,190,140,0.3)", margin: "0 auto 2rem", boxShadow: "0 0 60px rgba(212,190,140,0.15)" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.2rem", color: "rgba(255,255,255,0.95)", marginBottom: "0.5rem" }}>You showed up today.</h2>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "1rem", color: "rgba(255,255,255,0.5)", maxWidth: 280, lineHeight: 1.5, margin: "0 auto 2rem" }}>Menti is proud of you.</p>
            <button onClick={() => setShowCelebration(false)} style={{ padding: "0.85rem 2rem", background: "white", color: "#4A5C3F", fontWeight: 600, fontSize: "0.88rem", border: "none", borderRadius: 60, cursor: "pointer" }}>See you tomorrow &#8594;</button>
          </div>
        </div>
      )}

      <BottomNav />
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes gentlePulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>
    </div>
  );
}
