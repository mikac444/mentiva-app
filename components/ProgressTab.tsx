"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type Props = {
  userId: string;
  northStarGoal: string;
  t: (en: string, es: string) => string;
  currentStreak: number;
};

type WeekDot = {
  date: string;
  dayLabel: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
};

type EnfoqueProgress = {
  name: string;
  completed: number;
  total: number;
};

export default function ProgressTab({ userId, northStarGoal, t, currentStreak }: Props) {
  const [weekDots, setWeekDots] = useState<WeekDot[]>([]);
  const [enfoqueProgress, setEnfoqueProgress] = useState<EnfoqueProgress[]>([]);
  const [monthlyPercent, setMonthlyPercent] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadProgress() {
    const supabase = createClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Get week start (Monday)
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));

    // Build 7-day array
    const dayLabels = ["en", "en"].includes(t("en", "es"))
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    // Fetch streaks for this week
    const { data: weekStreaks } = await supabase
      .from("streaks")
      .select("date, non_negotiable_completed")
      .eq("user_id", userId)
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    const streakMap = new Map<string, boolean>();
    (weekStreaks ?? []).forEach((s: { date: string; non_negotiable_completed: boolean }) => {
      streakMap.set(s.date, s.non_negotiable_completed);
    });

    const dots: WeekDot[] = weekDates.map((date, i) => ({
      date,
      dayLabel: dayLabels[i],
      completed: streakMap.get(date) === true,
      isToday: date === todayStr,
      isFuture: date > todayStr,
    }));
    setWeekDots(dots);

    // Monthly progress: non_negotiable completed days / days elapsed this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const { data: monthStreaks } = await supabase
      .from("streaks")
      .select("date, non_negotiable_completed")
      .eq("user_id", userId)
      .gte("date", monthStartStr)
      .lte("date", todayStr);

    const daysElapsed = Math.max(1, today.getDate());
    const nnCompleted = (monthStreaks ?? []).filter(
      (s: { non_negotiable_completed: boolean }) => s.non_negotiable_completed
    ).length;
    setMonthlyPercent(Math.round((nnCompleted / daysElapsed) * 100));

    // Enfoque progress this week
    const { data: weekTasks } = await supabase
      .from("daily_tasks")
      .select("enfoque_name, completed")
      .eq("user_id", userId)
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    const enfoqueMap = new Map<string, { completed: number; total: number }>();
    (weekTasks ?? []).forEach((task: { enfoque_name: string; completed: boolean }) => {
      const name = task.enfoque_name || "General";
      if (!enfoqueMap.has(name)) enfoqueMap.set(name, { completed: 0, total: 0 });
      const entry = enfoqueMap.get(name)!;
      entry.total++;
      if (task.completed) entry.completed++;
    });
    setEnfoqueProgress(
      Array.from(enfoqueMap.entries()).map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
      }))
    );

    // Longest streak (from all streaks)
    const { data: allStreaks } = await supabase
      .from("streaks")
      .select("date, non_negotiable_completed")
      .eq("user_id", userId)
      .eq("non_negotiable_completed", true)
      .order("date", { ascending: true });

    let longest = 0;
    let current = 0;
    let prevDate: Date | null = null;
    (allStreaks ?? []).forEach((s: { date: string }) => {
      const d = new Date(s.date);
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.abs(diff - 1) < 0.5) {
          current++;
        } else {
          current = 1;
        }
      } else {
        current = 1;
      }
      if (current > longest) longest = current;
      prevDate = d;
    });
    setLongestStreak(longest);

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#7E8C74", fontSize: "0.85rem" }}>
        {t("Loading progress...", "Cargando progreso...")}
      </div>
    );
  }

  return (
    <div style={{ animation: "slideIn 0.5s ease both" }}>
      {/* North Star Progress */}
      <div style={{
        padding: "1.2rem",
        background: "rgba(157,180,140,0.08)",
        border: "1px solid rgba(157,180,140,0.15)",
        borderRadius: 16,
        marginBottom: "1rem",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "#9DB48C",
            boxShadow: "0 0 6px rgba(157,180,140,0.4)",
          }} />
          <span style={{
            fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em",
            textTransform: "uppercase" as const, color: "#7E8C74",
          }}>
            {t("North Star this month", "North Star este mes")}
          </span>
        </div>
        <p style={{
          fontSize: "0.85rem", color: "#5A6352", marginBottom: 10,
          fontStyle: "italic",
        }}>
          {northStarGoal}
        </p>
        <div style={{ position: "relative", height: 6, borderRadius: 6, background: "rgba(44,48,40,0.08)" }}>
          <div style={{
            height: "100%", borderRadius: 6,
            width: `${monthlyPercent}%`,
            background: "linear-gradient(90deg, #6B7E5C, #9DB48C)",
            transition: "width 0.8s ease",
          }} />
        </div>
        <div style={{
          textAlign: "right", fontSize: "0.7rem", color: "#6B7E5C",
          fontWeight: 600, marginTop: 4,
        }}>
          {monthlyPercent}% {t("this month", "este mes")}
        </div>
      </div>

      {/* Weekly Dots */}
      <div style={{
        padding: "1rem",
        background: "rgba(255,255,255,0.45)",
        border: "1px solid rgba(44,48,40,0.06)",
        borderRadius: 14,
        marginBottom: "1rem",
        backdropFilter: "blur(24px)",
      }}>
        <span style={{
          fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em",
          textTransform: "uppercase" as const, color: "#7E8C74",
          display: "block", marginBottom: 10,
        }}>
          {t("This week's non-negotiables", "No negociables de esta semana")}
        </span>
        <div style={{
          display: "flex", justifyContent: "space-between", gap: 4,
        }}>
          {weekDots.map((dot) => (
            <div key={dot.date} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: dot.completed
                  ? "#2C3028"
                  : dot.isFuture
                    ? "rgba(44,48,40,0.04)"
                    : "rgba(44,48,40,0.06)",
                border: dot.isToday
                  ? "2px solid rgba(107,126,92,0.5)"
                  : dot.completed
                    ? "none"
                    : "1px solid rgba(44,48,40,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: dot.isToday && !dot.completed ? "todayPulse 2s ease-in-out infinite" : undefined,
                transition: "all 0.3s",
              }}>
                {dot.completed && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#BBCBA8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: "0.6rem", fontWeight: 500, letterSpacing: "0.03em",
                color: dot.isToday
                  ? "#6B7E5C"
                  : "#7E8C74",
              }}>
                {dot.dayLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Enfoque Progress */}
      {enfoqueProgress.length > 0 && (
        <div style={{
          padding: "1rem",
          background: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(44,48,40,0.06)",
          borderRadius: 14,
          marginBottom: "1rem",
          backdropFilter: "blur(24px)",
        }}>
          <span style={{
            fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em",
            textTransform: "uppercase" as const, color: "#7E8C74",
            display: "block", marginBottom: 12,
          }}>
            {t("Focus areas this week", "Areas de enfoque esta semana")}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enfoqueProgress.map((ep) => {
              const pct = ep.total > 0 ? Math.round((ep.completed / ep.total) * 100) : 0;
              return (
                <div key={ep.name}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: "0.8rem", color: "#2C3028", fontWeight: 500 }}>
                      {ep.name}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#7E8C74" }}>
                      {ep.completed}/{ep.total}
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 4,
                    background: "rgba(44,48,40,0.08)",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${pct}%`,
                      background: "rgba(161,179,146,0.6)",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Streak display */}
      <div style={{
        padding: "1rem",
        background: "rgba(255,255,255,0.45)",
        border: "1px solid rgba(44,48,40,0.06)",
        borderRadius: 14,
        textAlign: "center",
        backdropFilter: "blur(24px)",
      }}>
        <div style={{
          fontSize: "2.2rem", fontWeight: 300,
          fontFamily: "'Cormorant Garamond', serif",
          color: currentStreak > 0 ? "#2C3028" : "#7E8C74",
          lineHeight: 1.1,
        }}>
          {currentStreak}
        </div>
        <div style={{
          fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
          color: "#7E8C74", marginTop: 2,
        }}>
          {t("day streak", "días seguidos")}
        </div>
        {longestStreak > currentStreak && (
          <div style={{
            fontSize: "0.68rem", color: "#7E8C74",
            marginTop: 6,
          }}>
            {t("Longest:", "Récord:")} {longestStreak} {t("days", "días")}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes todayPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(107,126,92,0.3); }
          50% { box-shadow: 0 0 0 4px rgba(107,126,92,0.1); }
        }
      `}</style>
    </div>
  );
}
