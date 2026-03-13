"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { TopNav } from "@/components/TopNav";
import MissionCard from "@/components/MissionCard";
import NorthStarPicker from "@/components/NorthStarPicker";
import EnfoquePicker from "@/components/EnfoquePicker";
import type { User } from "@supabase/supabase-js";
import type { MissionTask, GoalWithSteps } from "@/lib/analyze-types";

type AppState =
  | "loading"
  | "no-board"
  | "no-north-star"
  | "no-enfoques"
  | "choose-mode"
  | "generating"
  | "missions";

type WeekDot = {
  date: string;
  dayLabel: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
};

const MAX_TASKS = 5;

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
  });
}

export default function TodayPage() {
  const { t, lang: langRaw } = useLanguage();
  const lang = t("en", "es");

  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [activeTab, setActiveTab] = useState<"missions" | "journal" | "progress">("missions");

  // Mission data
  const [missions, setMissions] = useState<MissionTask[]>([]);
  const [motivationalPulse, setMotivationalPulse] = useState("");
  const [streak, setStreak] = useState(0);

  // Journal data
  const [journalText, setJournalText] = useState("");
  const [journalEntries, setJournalEntries] = useState<{ id: string; content: string; date: string; created_at: string }[]>([]);
  const [savingJournal, setSavingJournal] = useState(false);
  const [mentiMessage, setMentiMessage] = useState<string | null>(null);

  // North Star data
  const [northStarGoal, setNorthStarGoal] = useState("");
  const [northStarProgress, setNorthStarProgress] = useState(0);

  // Board goals (for pickers)
  const [boardGoals, setBoardGoals] = useState<GoalWithSteps[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);

  // Progress data (compact card)
  const [weekDots, setWeekDots] = useState<WeekDot[]>([]);
  const [longestStreak, setLongestStreak] = useState(0);

  // UI state
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const router = useRouter();

  const firstName =
    user?.user_metadata?.full_name?.split(/\s+/)[0] ??
    user?.user_metadata?.name?.split(/\s+/)[0] ??
    "friend";

  // ─── Computed ───
  const completed = missions.filter((m) => m.completed).length;
  const total = missions.length;

  // ─── Initialize ───
  const initialize = useCallback(async (userId: string) => {
    const supabase = createClient();

    // 1. Check if user has vision boards (fetch ALL, not just latest)
    const { data: boards } = await supabase
      .from("vision_boards")
      .select("id, analysis")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!boards || boards.length === 0) {
      setAppState("no-board");
      return;
    }

    // Combine goals from ALL vision boards, deduplicate, and limit for NorthStarPicker
    const allGoals: GoalWithSteps[] = [];
    for (const board of boards) {
      const goals: GoalWithSteps[] = board.analysis?.goalsWithSteps ?? [];
      allGoals.push(...goals);
    }

    // Deduplicate by normalized goal text and pick diverse set (max 5)
    const seen = new Set<string>();
    const areaCounts: Record<string, number> = {};
    const curated: GoalWithSteps[] = [];
    for (const g of allGoals) {
      const key = g.goal.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const area = g.area || "general";
      const count = areaCounts[area] || 0;
      if (count >= 2) continue; // max 2 per area for diversity
      areaCounts[area] = count + 1;
      curated.push(g);
      if (curated.length >= 5) break;
    }
    setBoardGoals(curated);
    setBoardId(boards[0].id);

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

      // 5. Fetch journal entries
      try {
        const journalRes = await fetch("/api/journal?days=all");
        const journalData = await journalRes.json();
        if (journalData.entries) setJournalEntries(journalData.entries);
      } catch {
        // Journal fetch failure is non-critical
      }

    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("Init error:", err);
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
        if (process.env.NODE_ENV !== "production") console.error("Mission generation failed:", data.error);
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
      if (process.env.NODE_ENV !== "production") console.error("Load missions error:", err);
      setAppState("missions");
    }
  }

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUser(user);
      initialize(user.id);
    });
  }, [router, initialize]);

  // Reset week — go back to North Star picker
  async function resetWeek() {
    if (!user?.id) return;
    const supabase = createClient();

    // Deactivate current North Star
    await supabase
      .from("north_stars")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Delete this week's enfoques
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const weekStart = monday.toISOString().split("T")[0];
    await supabase
      .from("enfoques")
      .delete()
      .eq("user_id", user.id)
      .eq("week_start", weekStart);

    // Delete today's missions
    const today = now.toISOString().split("T")[0];
    await supabase
      .from("daily_tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("date", today);

    // Reset state
    setMissions([]);
    setNorthStarGoal("");
    setMotivationalPulse("");
    setAppState("no-north-star");
  }

  // Language change detection — regenerate if needed
  useEffect(() => {
    if (appState !== "missions" || missions.length === 0) return;
    const missionLang = (missions[0] as MissionTask & { lang?: string })?.lang;
    if (missionLang && missionLang !== lang) {
      loadMissions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // ─── Fetch personalized Menti message ───
  useEffect(() => {
    if (appState !== "missions" || !user) return;
    fetch("/api/menti-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: firstName,
        lang,
        tasksCompleted: missions.filter(m => m.completed).length,
        tasksTotal: missions.length,
      }),
    })
      .then(res => res.json())
      .then(data => { if (data.message) setMentiMessage(data.message); })
      .catch(() => {}); // Silent fallback — UI has its own default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, user?.id]);

  // ─── Load progress data (compact card) ───
  async function loadProgressData() {
    if (!user?.id) return;
    const supabase = createClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Week dots
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const dayLabels = lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    const { data: weekStreaks } = await supabase
      .from("streaks")
      .select("date, non_negotiable_completed")
      .eq("user_id", user.id)
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    const streakMap = new Map<string, boolean>();
    (weekStreaks ?? []).forEach((s: { date: string; non_negotiable_completed: boolean }) => {
      streakMap.set(s.date, s.non_negotiable_completed);
    });

    setWeekDots(weekDates.map((date, i) => ({
      date,
      dayLabel: dayLabels[i],
      completed: streakMap.get(date) === true,
      isToday: date === todayStr,
      isFuture: date > todayStr,
    })));

    // Longest streak
    const { data: allStreaks } = await supabase
      .from("streaks")
      .select("date, non_negotiable_completed")
      .eq("user_id", user.id)
      .eq("non_negotiable_completed", true)
      .order("date", { ascending: true });

    let longest = 0;
    let current = 0;
    let prevDate: Date | null = null;
    (allStreaks ?? []).forEach((s: { date: string }) => {
      const d = new Date(s.date);
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.abs(diff - 1) < 0.5) current++;
        else current = 1;
      } else {
        current = 1;
      }
      if (current > longest) longest = current;
      prevDate = d;
    });
    setLongestStreak(longest);
  }

  useEffect(() => {
    if (appState !== "missions" || !user) return;
    loadProgressData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, user?.id]);

  // ─── Journal prompt personalization ───
  function getJournalPrompt(): string {
    if (completed === total && total > 0) {
      return t("You did it! How was your day?", "¡Lo lograste! ¿Cómo fue tu día?");
    }
    const nn = missions.find(m => m.task_type === "non_negotiable");
    if (nn?.completed) {
      return t("You completed your non-negotiable. How did it feel?", "Completaste tu no negociable. ¿Cómo te sentiste?");
    }
    if (completed > 0) {
      return t("How is your day going so far?", "¿Cómo va tu día hasta ahora?");
    }
    return t("What plans do you have for today?", "¿Qué planes tienes para hoy?");
  }

  // ─── Save journal entry ───
  async function saveJournalEntry() {
    if (!user || !journalText.trim()) return;
    setSavingJournal(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: journalText.trim() }),
      });
      const data = await res.json();
      if (data.entry) {
        setJournalEntries(prev => [data.entry, ...prev]);
        setJournalText("");
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("Failed to save journal entry:", e);
    }
    setSavingJournal(false);
  }

  // ─── Format journal entry date ───
  function formatEntryDate(isoDate: string): string {
    const d = new Date(isoDate);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    if (isToday) return `${lang === "es" ? "Hoy" : "Today"}, ${time}`;
    return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) + `, ${time}`;
  }

  // ─── Edit task text ───
  async function editTask(taskId: string, newText: string) {
    setMissions((prev) =>
      prev.map((m) => (m.id === taskId ? { ...m, task_text: newText } : m))
    );
    const supabase = createClient();
    await supabase.from("daily_tasks").update({ task_text: newText }).eq("id", taskId);
  }

  // ─── Delete task ───
  function deleteTask(taskId: string) {
    setConfirmDeleteId(taskId);
  }
  async function confirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setMissions((prev) => prev.filter((m) => m.id !== id));
    const supabase = createClient();
    await supabase.from("daily_tasks").delete().eq("id", id);
  }

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
      if (process.env.NODE_ENV !== "production") console.error("Swap failed:", err);
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
      if (process.env.NODE_ENV !== "production") console.error("Failed to save North Star:", err);
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

      // Show choice: Menti suggests vs write your own
      setAppState("choose-mode");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("Failed to save enfoques:", err);
    }
  }

  // ─── Choose mode handlers ───
  async function chooseMentiSuggests() {
    await loadMissions(false);
  }

  async function chooseWriteOwn() {
    if (!user?.id) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Create 3 empty tasks for the user to fill in
    const types = ["non_negotiable", "secondary", "micro"] as const;
    const enfoques = [northStarGoal, ...(await getEnfoqueNames())];

    const inserts = types.map((taskType, i) => ({
      user_id: user.id,
      task_text: "",
      task_type: taskType,
      enfoque_name: enfoques[i] || enfoques[0] || "General",
      estimated_minutes: taskType === "non_negotiable" ? 25 : taskType === "secondary" ? 15 : 5,
      completed: false,
      date: today,
      goal_name: enfoques[i] || enfoques[0] || "General",
    }));

    const { data } = await supabase.from("daily_tasks").insert(inserts).select();
    if (data) {
      setMissions(data as MissionTask[]);
    }
    setAppState("missions");
  }

  async function getEnfoqueNames(): Promise<string[]> {
    try {
      const res = await fetch("/api/enfoques");
      const data = await res.json();
      return (data.enfoques || []).map((e: { name: string }) => e.name);
    } catch {
      return [];
    }
  }

  // ─── Add custom task ───
  async function addTask() {
    if (!user?.id || missions.length >= MAX_TASKS) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase.from("daily_tasks").insert({
      user_id: user.id,
      task_text: "",
      task_type: "secondary",
      enfoque_name: "General",
      estimated_minutes: 15,
      completed: false,
      date: today,
      goal_name: "General",
    }).select().single();

    if (data) {
      setMissions((prev) => [...prev, data as MissionTask]);
    }
  }

  // ═══════════════════════════════════════
  // ─── RENDER ───
  // ═══════════════════════════════════════

  // ─── LOADING ───
  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-mentiva-gradient flex items-center justify-center">
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: "#BBCBA8",
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
        {/* ═══ FIXED HEADER ═══ */}
        <div className="text-center pt-6 pb-2">
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "#5A6352",
          }}>
            {getGreeting(lang)}
            <span style={{
              display: "block", fontSize: "clamp(2rem, 7vw, 2.8rem)",
              color: "#2C3028", fontWeight: 300, letterSpacing: "-0.03em",
            }}>
              <em style={{ color: "#6B7E5C", fontStyle: "italic" }}>{firstName}</em>
            </span>
          </h1>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(44,48,40,0.08)", borderRadius: 30,
            fontSize: "0.72rem", color: "#5A6352",
            letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "0.6rem",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7E8C74" }} />
            {getToday(lang)}
          </div>
        </div>

        {/* ═══ PRE-MISSION STATES ═══ */}

        {/* ─── NO BOARD ─── */}
        {appState === "no-board" && (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "rgba(255,255,255,0.45)", borderRadius: 16,
            border: "1px solid rgba(44,48,40,0.05)", marginTop: "1.5rem",
          }}>
            <div style={{ marginBottom: "0.8rem", display: "flex", justifyContent: "center" }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#BBCBA8" }} />
            </div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "1.3rem", color: "#2C3028", marginBottom: "0.5rem",
            }}>
              {t("Start your journey", "Comienza tu camino")}
            </h3>
            <p style={{
              fontSize: "0.85rem", color: "#7E8C74",
              marginBottom: "1.2rem", lineHeight: 1.5,
            }}>
              {t(
                "Upload a vision board and Menti will create your personalized mission plan.",
                "Sube un tablero de visión y Menti creará tu plan de misiones personalizado."
              )}
            </p>
            <a href="/upload" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.8rem 1.6rem", background: "#2C3028", color: "#D8D3C6",
              fontWeight: 600, fontSize: "0.9rem", border: "none", borderRadius: 40,
              textDecoration: "none",
            }}>
              {t("Upload my vision board", "Subir mi tablero de visión")} {String.fromCharCode(8594)}
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

        {/* ─── CHOOSE MODE ─── */}
        {appState === "choose-mode" && (
          <div style={{ animation: "fadeIn 0.3s ease", marginTop: "1.5rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", margin: "0 auto 1rem",
                background: "rgba(187,203,168,0.15)", border: "1px solid rgba(187,203,168,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#BBCBA8" }} />
              </div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                fontSize: "clamp(1.3rem, 5vw, 1.7rem)", color: "#2C3028",
                lineHeight: 1.2, marginBottom: "0.4rem",
              }}>
                {t("How do you want to start today?", "¿Cómo quieres empezar hoy?")}
              </h2>
              <p style={{
                fontSize: "0.85rem", color: "#7E8C74", lineHeight: 1.5,
                maxWidth: 300, margin: "0 auto",
              }}>
                {t(
                  "Choose how you'd like to plan your day.",
                  "Elige cómo quieres planificar tu día."
                )}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
              {/* Option 1: Menti suggests */}
              <button
                onClick={chooseMentiSuggests}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "1.1rem 1.2rem", textAlign: "left",
                  background: "rgba(187,203,168,0.1)",
                  border: "1.5px solid rgba(187,203,168,0.3)",
                  borderRadius: 14, cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "rgba(187,203,168,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#BBCBA8" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#2C3028", marginBottom: 2 }}>
                    {t("Menti plans my day", "Menti planifica mi día")}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#5A6352" }}>
                    {t("Get personalized task suggestions", "Recibe sugerencias personalizadas")}
                  </div>
                </div>
              </button>

              {/* Option 2: Write your own */}
              <button
                onClick={chooseWriteOwn}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "1.1rem 1.2rem", textAlign: "left",
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(44,48,40,0.06)",
                  borderRadius: 14, cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7E8C74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#2C3028", marginBottom: 2 }}>
                    {t("I'll write my own", "Yo escribo las mías")}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#5A6352" }}>
                    {t("Set your own tasks for today", "Define tus propias tareas de hoy")}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ─── GENERATING ─── */}
        {appState === "generating" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", marginTop: "1.5rem" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(187,203,168,0.4) 0%, transparent 70%)",
              border: "1px solid rgba(187,203,168,0.25)",
              margin: "0 auto 1.5rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "gentlePulse 2s ease-in-out infinite",
            }}>
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#BBCBA8" }} />
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.3rem, 5vw, 1.7rem)", color: "#2C3028",
              marginBottom: "0.5rem",
            }}>
              {t("Preparing your missions...", "Preparando tus misiones...")}
            </h2>
            <p style={{
              fontSize: "0.82rem", color: "#7E8C74",
              lineHeight: 1.5, maxWidth: 280, margin: "0 auto",
            }}>
              {t(
                "Menti is creating your personalized daily missions.",
                "Menti está creando tus misiones diarias personalizadas."
              )}
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* ═══ CARD STACK (missions state) ═══ */}
        {/* ═══════════════════════════════════════ */}
        {appState === "missions" && (
          <>
            {/* ─── Compact North Star + Streak Header ─── */}
            {northStarGoal && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0.75rem 1rem",
                background: "rgba(187,203,168,0.06)",
                border: "1px solid rgba(187,203,168,0.12)",
                borderRadius: 14,
                marginTop: "0.8rem", marginBottom: "0.8rem",
              }}>
                {/* North Star info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#BBCBA8",
                      boxShadow: "0 0 6px rgba(187,203,168,0.4)",
                    }} />
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em",
                      textTransform: "uppercase" as const, color: "rgba(187,203,168,0.6)",
                    }}>
                      North Star
                    </span>
                  </div>
                  <p style={{
                    fontSize: "0.8rem", fontWeight: 500, color: "#2C3028",
                    lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const, margin: 0,
                  }}>
                    {northStarGoal}
                  </p>
                  <div style={{
                    height: 3, borderRadius: 3, background: "rgba(44,48,40,0.06)", marginTop: 5,
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${northStarProgress}%`,
                      background: "linear-gradient(90deg, #9DB48C, #BBCBA8)",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* Streak badge */}
                {streak > 0 && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "0.35rem 0.7rem",
                    background: streak >= 7 ? "rgba(187,203,168,0.12)" : "rgba(255,255,255,0.45)",
                    border: streak >= 7 ? "1px solid rgba(187,203,168,0.25)" : "1px solid rgba(44,48,40,0.05)",
                    borderRadius: 10, flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: "1.1rem", fontWeight: 600, lineHeight: 1,
                      color: streak >= 7 ? "#6B7E5C" : "#7E8C74",
                    }}>
                      {streak}
                    </span>
                    <span style={{
                      fontSize: "0.52rem", fontWeight: 600,
                      color: streak >= 7 ? "rgba(187,203,168,0.6)" : "#7E8C74",
                      textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    }}>
                      {t("days", "días")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab Bar ─── */}
            <div style={{
              display: "flex", gap: 4,
              background: "rgba(44,48,40,0.15)",
              borderRadius: 14, padding: 4,
              marginBottom: "1rem",
            }}>
              {([
                { key: "missions" as const, label: t("Missions", "Misiones"), icon: "check" },
                { key: "journal" as const, label: t("Reflection", "Reflexión"), icon: "feather" },
                { key: "progress" as const, label: t("Progress", "Progreso"), icon: "pulse" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    padding: "10px 8px",
                    background: activeTab === tab.key ? "rgba(255,255,255,0.85)" : "none",
                    border: "none",
                    borderRadius: 11,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem", fontWeight: 500,
                    color: activeTab === tab.key ? "#2C3028" : "#5A6352",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: activeTab === tab.key ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                    position: "relative",
                  }}
                >
                  {tab.icon === "check" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === tab.key ? 0.8 : 0.5 }}>
                      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                  )}
                  {tab.icon === "feather" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === tab.key ? 0.8 : 0.5 }}>
                      <path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z" />
                      <line x1="16" y1="8" x2="2" y2="22" />
                    </svg>
                  )}
                  {tab.icon === "pulse" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === tab.key ? 0.8 : 0.5 }}>
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  )}
                  {tab.label}
                  {/* Badge for incomplete missions */}
                  {tab.key === "missions" && total > 0 && completed < total && (
                    <span style={{
                      position: "absolute", top: 4, right: 8,
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#9DB48C",
                    }} />
                  )}
                </button>
              ))}
            </div>

            {/* ═══ TAB CONTENT ═══ */}

            {/* ═══ MISSIONS TAB ═══ */}
            {activeTab === "missions" && (
              <div style={{
                background: "rgba(255,255,255,0.45)",
                border: "1px solid rgba(44,48,40,0.05)",
                borderRadius: 20, padding: "1.5rem",
                position: "relative", overflow: "hidden",
                animation: "tabFadeIn 0.35s ease",
              }}>
                <style>{`@keyframes tabFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                {/* Gold accent top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent 0%, rgba(107,126,92,0.4) 50%, transparent 100%)",
                }} />
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
                            onEdit={editTask}
                            onSwap={swapTask}
                            onDelete={deleteTask}
                            swapping={swappingId === m.id}
                            justCompleted={justCompleted === m.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: "center",
                        padding: "2rem 1.5rem",
                        background: "rgba(255,255,255,0.35)",
                        borderRadius: 16,
                        margin: "0.5rem 0",
                      }}>
                        {/* Checkmark clipboard icon */}
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto 0.8rem" }}>
                          <rect x="10" y="6" width="20" height="28" rx="3" stroke="rgba(107,126,92,0.3)" strokeWidth="1.2" fill="none" />
                          <rect x="15" y="3" width="10" height="5" rx="2" stroke="rgba(107,126,92,0.3)" strokeWidth="1.2" fill="none" />
                          <path d="M16 20l3 3 5-6" stroke="#6B7E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 400,
                          fontSize: "1.1rem",
                          color: "#2C3028",
                          margin: "0 0 0.4rem",
                          lineHeight: 1.3,
                        }}>
                          {t("Your missions are on the way", "Tus misiones están en camino")}
                        </p>
                        <p style={{
                          fontSize: "0.82rem",
                          color: "#7E8C74",
                          lineHeight: 1.5,
                          margin: 0,
                          maxWidth: 260,
                          marginLeft: "auto",
                          marginRight: "auto",
                        }}>
                          {t(
                            "Set your weekly focus areas to generate daily missions",
                            "Define tus enfoques semanales para generar misiones diarias"
                          )}
                        </p>
                      </div>
                    )}

                    {/* Menti message — warm bubble style */}
                    {(mentiMessage || motivationalPulse) && (
                      <div style={{
                        position: "relative", margin: "1rem 0 0.5rem",
                        padding: "0.8rem 1rem",
                        background: "rgba(44,48,40,0.06)",
                        borderLeft: "3px solid rgba(107,126,92,0.4)",
                        borderRadius: "0 12px 12px 0",
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6, marginBottom: "0.25rem",
                        }}>
                          <div style={{
                            width: 5, height: 5, borderRadius: "50%", background: "#9DB48C",
                            animation: "gentlePulse 3s ease-in-out infinite",
                          }} />
                          <span style={{
                            fontSize: "0.6rem", fontWeight: 700, color: "#6B7E5C",
                            textTransform: "uppercase" as const, letterSpacing: "0.1em",
                          }}>
                            Menti
                          </span>
                        </div>
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                          fontWeight: 400, fontSize: "0.95rem",
                          color: "#5A6352", lineHeight: 1.6,
                          margin: 0,
                        }}>
                          {mentiMessage || motivationalPulse}
                        </p>
                      </div>
                    )}

                    {/* Summary */}
                    {total > 0 && (
                      <div style={{
                        textAlign: "center", fontSize: "0.78rem",
                        color: "#5A6352", marginTop: "0.5rem",
                      }}>
                        {completed}/{total} {t("completed", "completadas")}
                      </div>
                    )}

                    {/* Add task button */}
                    {missions.length < MAX_TASKS && (
                      <button
                        onClick={addTask}
                        style={{
                          width: "100%", padding: "0.7rem",
                          marginTop: "0.6rem",
                          background: "rgba(255,255,255,0.45)",
                          border: "1px dashed rgba(44,48,40,0.1)",
                          borderRadius: 12,
                          color: "#5A6352",
                          fontSize: "0.82rem", fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        + {t("Add task", "Agregar tarea")}
                      </button>
                    )}

                    {/* Reset / change focus */}
                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                      <button
                        onClick={resetWeek}
                        style={{
                          background: "none", border: "none",
                          fontSize: "0.75rem", color: "#7E8C74",
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          textDecoration: "underline", textUnderlineOffset: 3,
                        }}
                      >
                        {t("Change my focus", "Cambiar mi enfoque")}
                      </button>
                    </div>
              </div>
            )}

            {/* ═══ JOURNAL TAB ═══ */}
            {activeTab === "journal" && (
              <div style={{
                background: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(44,48,40,0.08)",
                borderRadius: 20, padding: "1.5rem",
                position: "relative", overflow: "hidden",
                animation: "tabFadeIn 0.35s ease",
              }}>
                {/* Gold accent top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent 0%, rgba(107,126,92,0.4) 50%, transparent 100%)",
                }} />
                    {/* Card header — feather icon + title */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, marginBottom: "1.2rem",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(44,48,40,0.08)",
                        border: "1px solid rgba(44,48,40,0.10)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                          <line x1="16" y1="8" x2="2" y2="22" />
                          <line x1="17.5" y1="15" x2="9" y2="15" />
                        </svg>
                      </div>
                      <div>
                        <h3 style={{
                          fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
                          fontSize: "1.15rem", color: "#2C3028",
                          margin: 0, lineHeight: 1.2,
                        }}>
                          {t("Your Reflection", "Tu Reflexión")}
                        </h3>
                        <span style={{
                          fontSize: "0.65rem", color: "#5A6352",
                          fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {t("A moment of peace", "Un momento de paz")}
                        </span>
                      </div>
                    </div>

                    {/* Menti prompt bubble */}
                    <div style={{
                      padding: "0.8rem 1rem",
                      background: "rgba(44,48,40,0.06)",
                      borderLeft: "3px solid rgba(107,126,92,0.4)",
                      borderRadius: "0 12px 12px 0",
                      marginBottom: "1rem",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginBottom: "0.25rem",
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%", background: "#9DB48C",
                          animation: "gentlePulse 3s ease-in-out infinite",
                        }} />
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700, color: "#6B7E5C",
                          textTransform: "uppercase" as const, letterSpacing: "0.1em",
                        }}>
                          Menti
                        </span>
                      </div>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                        fontWeight: 400, fontSize: "1rem",
                        color: "#5A6352", lineHeight: 1.5,
                        margin: 0,
                      }}>
                        {getJournalPrompt()}
                      </p>
                    </div>

                    {/* Notebook-style textarea */}
                    <div style={{
                      background: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(44,48,40,0.06)",
                      borderRadius: 14, padding: "1rem", marginBottom: "0.8rem",
                      backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(44,48,40,0.04) 27px, rgba(44,48,40,0.04) 28px)",
                    }}>
                      <textarea
                        value={journalText}
                        onChange={(e) => setJournalText(e.target.value)}
                        placeholder={t(
                          "Write your thoughts here...",
                          "Escribe tus pensamientos aquí..."
                        )}
                        style={{
                          width: "100%", minHeight: 140,
                          background: "transparent", border: "none", outline: "none",
                          color: "#2C3028", fontSize: "0.9rem",
                          lineHeight: "28px", resize: "vertical",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
                        <button
                          onClick={saveJournalEntry}
                          disabled={!journalText.trim() || savingJournal}
                          style={{
                            padding: "0.5rem 1.4rem",
                            background: journalText.trim() ? "#2C3028" : "rgba(44,48,40,0.05)",
                            color: journalText.trim() ? "rgba(255,255,255,0.92)" : "#5A6352",
                            border: "none", borderRadius: 20,
                            fontSize: "0.82rem", fontWeight: 600,
                            cursor: journalText.trim() ? "pointer" : "default",
                            transition: "all 0.3s",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {savingJournal
                            ? t("Saving...", "Guardando...")
                            : t("Save", "Guardar")}
                        </button>
                      </div>
                    </div>

                    {/* Previous entries */}
                    {journalEntries.length > 0 ? (
                      <div>
                        {/* Reflection counter */}
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          marginBottom: "0.5rem",
                        }}>
                          <span style={{
                            fontSize: "0.65rem", color: "#5A6352",
                            textTransform: "uppercase" as const, letterSpacing: "0.1em",
                            fontWeight: 700,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            {t("Recent entries", "Entradas recientes")}
                          </span>
                          <span style={{
                            fontSize: "0.62rem", color: "#7E8C74",
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                          }}>
                            {journalEntries.length} {t("total", "total")}
                          </span>
                        </div>
                        {journalEntries.slice(0, 10).map((entry) => (
                          <div key={entry.id} style={{
                            padding: "0.7rem 0.8rem",
                            background: "rgba(255,255,255,0.35)",
                            border: "1px solid rgba(44,48,40,0.08)",
                            borderRadius: 12, marginBottom: "0.3rem",
                          }}>
                            <div style={{
                              fontSize: "0.6rem", color: "#7E8C74",
                              marginBottom: "0.3rem", fontFamily: "'DM Sans', sans-serif",
                            }}>
                              {formatEntryDate(entry.created_at)}
                            </div>
                            <div style={{
                              fontSize: "0.82rem", color: "#7E8C74",
                              lineHeight: 1.5,
                              fontFamily: "'DM Sans', sans-serif",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as const,
                            }}>
                              {entry.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Empty state */
                      <div style={{
                        textAlign: "center",
                        padding: "1.8rem 1.2rem",
                        background: "rgba(255,255,255,0.25)",
                        borderRadius: 14,
                        margin: "0.3rem 0",
                      }}>
                        {/* Feather/pencil icon */}
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ margin: "0 auto 0.7rem" }}>
                          <circle cx="18" cy="18" r="17" stroke="rgba(107,126,92,0.15)" strokeWidth="1" fill="none" />
                          <path d="M23.24 14.24a4.5 4.5 0 0 0-6.37-6.37L12 12.38V18.5h6.38z" stroke="#6B7E5C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          <line x1="19" y1="11" x2="9" y2="27" stroke="#6B7E5C" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 400,
                          fontSize: "1.05rem",
                          color: "#2C3028",
                          margin: "0 0 0.35rem",
                          lineHeight: 1.3,
                        }}>
                          {t("No reflections yet", "Aún no hay reflexiones")}
                        </p>
                        <p style={{
                          fontSize: "0.78rem",
                          color: "#7E8C74",
                          lineHeight: 1.5,
                          margin: 0,
                          maxWidth: 240,
                          marginLeft: "auto",
                          marginRight: "auto",
                          fontStyle: "italic",
                        }}>
                          {t(
                            "Write your first thought above — even a sentence counts",
                            "Escribe tu primer pensamiento arriba — incluso una frase cuenta"
                          )}
                        </p>
                      </div>
                    )}
              </div>
            )}

            {/* ═══ PROGRESS TAB ═══ */}
            {activeTab === "progress" && (
              <div style={{
                background: "rgba(255,255,255,0.45)",
                border: "1px solid rgba(44,48,40,0.05)",
                borderRadius: 20, padding: "1.5rem",
                position: "relative", overflow: "hidden",
                animation: "tabFadeIn 0.35s ease",
              }}>
                {/* Gold accent top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent 0%, rgba(161,179,146,0.3) 50%, transparent 100%)",
                }} />
                    {/* 3 Stats Row */}
                    <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
                      {/* Streak */}
                      <div style={{
                        flex: 1, textAlign: "center",
                        padding: "0.8rem 0.5rem",
                        background: streak >= 7 ? "rgba(157,180,140,0.08)" : "rgba(255,255,255,0.45)",
                        border: streak >= 7 ? "1px solid rgba(44,48,40,0.10)" : "1px solid rgba(44,48,40,0.04)",
                        borderRadius: 14,
                      }}>
                        <div style={{
                          fontSize: "1.8rem", fontWeight: 300,
                          fontFamily: "'Cormorant Garamond', serif",
                          color: streak > 0 ? "#6B7E5C" : "#5A6352",
                          lineHeight: 1,
                        }}>
                          {streak}
                        </div>
                        <div style={{
                          fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                          color: "#5A6352", marginTop: 3,
                        }}>
                          {t("Streak", "Racha")}
                        </div>
                      </div>

                      {/* Record */}
                      <div style={{
                        flex: 1, textAlign: "center",
                        padding: "0.8rem 0.5rem",
                        background: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(44,48,40,0.04)",
                        borderRadius: 14,
                      }}>
                        <div style={{
                          fontSize: "1.8rem", fontWeight: 300,
                          fontFamily: "'Cormorant Garamond', serif",
                          color: longestStreak > 0 ? "#5A6352" : "#5A6352",
                          lineHeight: 1,
                        }}>
                          {longestStreak}
                        </div>
                        <div style={{
                          fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                          color: "#5A6352", marginTop: 3,
                        }}>
                          {t("Record", "Récord")}
                        </div>
                      </div>

                      {/* Month % */}
                      <div style={{
                        flex: 1, textAlign: "center",
                        padding: "0.8rem 0.5rem",
                        background: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(44,48,40,0.04)",
                        borderRadius: 14,
                      }}>
                        <div style={{
                          fontSize: "1.8rem", fontWeight: 300,
                          fontFamily: "'Cormorant Garamond', serif",
                          color: northStarProgress > 0 ? "rgba(161,179,146,0.8)" : "#5A6352",
                          lineHeight: 1,
                        }}>
                          {northStarProgress}%
                        </div>
                        <div style={{
                          fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                          color: "#5A6352", marginTop: 3,
                        }}>
                          {t("Month", "Mes")}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Dots */}
                    <div style={{
                      padding: "0.8rem",
                      background: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(44,48,40,0.04)",
                      borderRadius: 14, marginBottom: "0.8rem",
                    }}>
                      <div style={{
                        fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em",
                        textTransform: "uppercase" as const, color: "#5A6352",
                        marginBottom: 8,
                      }}>
                        {t("This week", "Esta semana")}
                      </div>
                      <div style={{
                        display: "flex", justifyContent: "space-between", gap: 4,
                      }}>
                        {weekDots.map((dot) => (
                          <div key={dot.date} style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1,
                          }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%",
                              background: dot.completed
                                ? "#9DB48C"
                                : dot.isFuture
                                  ? "rgba(255,255,255,0.45)"
                                  : "rgba(255,255,255,0.35)",
                              border: dot.isToday
                                ? "2px solid #7E8C74"
                                : dot.completed
                                  ? "none"
                                  : "1px solid rgba(44,48,40,0.06)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              animation: dot.isToday && !dot.completed ? "todayPulse 2s ease-in-out infinite" : undefined,
                              transition: "all 0.3s",
                            }}>
                              {dot.completed && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2C3028" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <span style={{
                              fontSize: "0.55rem", fontWeight: 500, letterSpacing: "0.03em",
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

                    {/* Monthly Progress Bar */}
                    <div style={{
                      padding: "0.8rem",
                      background: "rgba(44,48,40,0.06)",
                      border: "1px solid rgba(44,48,40,0.08)",
                      borderRadius: 14,
                    }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: 6,
                      }}>
                        <span style={{
                          fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em",
                          textTransform: "uppercase" as const, color: "#7E8C74",
                        }}>
                          {t("North Star this month", "North Star este mes")}
                        </span>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 600, color: "#6B7E5C",
                        }}>
                          {northStarProgress}%
                        </span>
                      </div>
                      <div style={{
                        height: 5, borderRadius: 5, background: "rgba(44,48,40,0.06)",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: 5,
                          width: `${northStarProgress}%`,
                          background: "linear-gradient(90deg, #6B7E5C, #9DB48C)",
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>

                    {/* Streak display */}
                    {longestStreak > streak && (
                      <div style={{
                        textAlign: "center", fontSize: "0.68rem",
                        color: "#7E8C74", marginTop: "0.8rem",
                      }}>
                        {t("Longest:", "Récord:")} {longestStreak} {t("days", "días")}
                      </div>
                    )}

                    {/* Motivational line */}
                    <div style={{
                      textAlign: "center", marginTop: "1rem",
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                      fontSize: "0.88rem", color: "rgba(107,126,92,0.4)",
                      lineHeight: 1.5,
                    }}>
                      {streak > 0
                        ? t("Every day counts.", "Cada día cuenta.")
                        : t("Today is a great day to start.", "Hoy es un gran día para empezar.")}
                    </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Delete confirmation modal ─── */}
      {confirmDeleteId && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(10,10,12,0.5)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            animation: "fadeIn 0.2s ease",
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, rgba(30,28,33,0.97), rgba(20,18,24,0.98))",
              border: "1px solid rgba(157,180,140,0.12)",
              borderRadius: 20, padding: "1.8rem 1.5rem 1.5rem", maxWidth: 340, width: "100%",
              textAlign: "center",
              animation: "slideUp 0.3s ease",
              boxShadow: "0 -4px 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Icon */}
            <div style={{ marginBottom: "0.8rem" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7E8C74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
              fontSize: "1.15rem", color: "rgba(255,255,255,0.9)",
              margin: "0 0 0.4rem",
            }}>
              {t("Remove this task?", "¿Eliminar esta tarea?")}
            </h3>
            <p style={{
              fontSize: "0.78rem", color: "rgba(255,255,255,0.35)",
              lineHeight: 1.5, margin: "0 0 1.3rem",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {t("This action can't be undone.", "Esta acción no se puede deshacer.")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={confirmDelete}
                style={{
                  width: "100%", padding: "0.75rem",
                  background: "rgba(44,48,40,0.08)", border: "1px solid rgba(157,180,140,0.2)",
                  borderRadius: 12, color: "#6B7E5C",
                  fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {t("Yes, remove", "Sí, eliminar")}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  width: "100%", padding: "0.75rem",
                  background: "transparent", border: "none",
                  borderRadius: 12, color: "rgba(255,255,255,0.4)",
                  fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t("Cancel", "Cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

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
              marginBottom: "1rem",
              animation: "celebBounce 0.6s ease",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6B7E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)", color: "#6B7E5C",
              marginBottom: "0.5rem",
            }}>
              {t("All missions complete!", "¡Todas las misiones completadas!")}
            </h2>
            <p style={{
              fontSize: "0.85rem", color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5, maxWidth: 280, margin: "0 auto",
            }}>
              {t(
                "You did it. Another day closer to your North Star.",
                "Lo lograste. Un día más cerca de tu North Star."
              )}
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                marginTop: "1.5rem", padding: "0.7rem 2rem",
                background: "rgba(157,180,140,0.2)", border: "1px solid rgba(107,126,92,0.4)",
                borderRadius: 30, color: "#6B7E5C", fontSize: "0.85rem",
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
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes celebPop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes celebBounce { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes todayPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(107,126,92,0.4); } 50% { box-shadow: 0 0 0 4px rgba(44,48,40,0.08); } }
      `}</style>
    </div>
  );
}
