"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import type { AnalysisResult } from "@/lib/analyze-types";

const MAX_LONGEST_SIDE = 1024;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      const scale = MAX_LONGEST_SIDE / Math.max(w, h);
      const width = Math.round(w * scale);
      const height = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Could not get canvas context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

const headerStyle = { background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
const inputStyle = { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", color: "white", backdropFilter: "blur(10px)" };

type GoalWithArea = {
  goal: string;
  area?: string;
  steps: string[];
};

// Area color mapping
const AREA_COLORS: Record<string, string> = {
  business: "#D4BE8C", negocio: "#D4BE8C",
  health: "#8CB39A", salud: "#8CB39A",
  finance: "#B3A18C", finanzas: "#B3A18C",
  relationships: "#C48B8B", relaciones: "#C48B8B",
  learning: "#8C9EB3", aprendizaje: "#8C9EB3",
  creative: "#B38CB3", creativo: "#B38CB3",
  routine: "#8CB3B3", rutina: "#8CB3B3",
  other: "#A1B392", otro: "#A1B392",
};

function getAreaColor(area?: string): string {
  return AREA_COLORS[area || "other"] || "#A1B392";
}

/* ===== LOADING SCREEN ===== */
function AnalyzingScreen({ t }: { t: (en: string, es: string) => string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    t("Finding your themes...", "Encontrando tus temas..."),
    t("Identifying your goals...", "Identificando tus metas..."),
    t("Discovering patterns...", "Descubriendo patrones..."),
    t("Creating your action plan...", "Creando tu plan de acción..."),
    t("Almost ready...", "Casi listo..."),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mentiva-gradient">
      <div className="flex flex-col items-center text-center px-8 max-w-[380px]">
        <div style={{ position: "relative", width: 140, height: 140, marginBottom: "2.5rem" }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "1.5px solid rgba(212,190,140,0.2)",
            animation: "haloSpin 4s linear infinite",
          }}>
            <div style={{
              position: "absolute", top: -2, left: "50%", width: 6, height: 6,
              borderRadius: "50%", background: "#D4BE8C", transform: "translateX(-50%)",
              boxShadow: "0 0 12px rgba(212,190,140,0.6)",
            }} />
          </div>
          <div style={{
            position: "absolute", inset: 15, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            animation: "haloSpin 6s linear infinite reverse",
          }}>
            <div style={{
              position: "absolute", top: -2, left: "50%", width: 4, height: 4,
              borderRadius: "50%", background: "rgba(255,255,255,0.5)", transform: "translateX(-50%)",
              boxShadow: "0 0 8px rgba(255,255,255,0.3)",
            }} />
          </div>
          <div style={{
            position: "absolute", inset: 25, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,190,140,0.25) 0%, rgba(212,190,140,0.05) 50%, transparent 70%)",
            animation: "glowPulse 3s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 35, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,190,140,0.15) 0%, transparent 70%)",
            border: "1px solid rgba(212,190,140,0.15)",
          }} />
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
          fontSize: "clamp(1.6rem, 5vw, 2.2rem)", color: "rgba(255,255,255,0.95)",
          lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "1rem",
        }}>
          {t("Menti is reading", "Menti est\u00e1 leyendo")}<br />{t("your dreams...", "tus sue\u00f1os...")}
        </h1>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: 280 }}>
          {t("Analyzing your vision board to create your personalized roadmap", "Analizando tu tablero de visi\u00f3n para crear tu hoja de ruta personalizada")}
        </p>

        <div style={{ marginTop: "2.5rem", height: 24, position: "relative", width: "100%" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              position: "absolute", width: "100%", textAlign: "center",
              fontSize: "0.82rem", fontWeight: 500, color: "rgba(212,190,140,0.7)",
              letterSpacing: "0.03em", opacity: i === msgIndex ? 1 : 0,
              transform: i === msgIndex ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.5s ease",
            }}>
              {msg}
            </div>
          ))}
        </div>

        <div style={{ width: 200, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: "2rem", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, rgba(212,190,140,0.3), rgba(212,190,140,0.8))",
            animation: "progressGrow 15s ease-in-out forwards",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes haloSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes progressGrow {
          0% { width: 0%; } 15% { width: 20%; } 35% { width: 40%; }
          55% { width: 60%; } 75% { width: 75%; } 90% { width: 88%; } 100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}

/* ===== ENHANCING SCREEN ===== */
function EnhancingScreen({ t }: { t: (en: string, es: string) => string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mentiva-gradient">
      <div className="flex flex-col items-center text-center px-8 max-w-[380px]">
        <div style={{ marginBottom: "1.5rem", animation: "glowPulse 2s ease-in-out infinite", display: "flex", justifyContent: "center" }}><span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: "#D4BE8C" }} /></div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
          fontSize: "clamp(1.4rem, 5vw, 1.8rem)", color: "rgba(255,255,255,0.95)",
          lineHeight: 1.3, marginBottom: "0.8rem",
        }}>
          {t("Updating your roadmap...", "Actualizando tu hoja de ruta...")}
        </h1>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
          {t("Menti is combining your board with your new goals", "Menti está combinando tu board con tus nuevas metas")}
        </p>
        <div style={{ width: 160, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: "2rem", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, rgba(212,190,140,0.3), rgba(212,190,140,0.8))",
            animation: "progressGrow 10s ease-in-out forwards",
          }} />
        </div>
      </div>
      <style>{`
        @keyframes glowPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes progressGrow {
          0% { width: 0%; } 30% { width: 35%; } 60% { width: 65%; } 85% { width: 85%; } 100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}

/* ===== DISCOVERY QUESTIONS ===== */
const DISCOVERY_QUESTIONS = {
  en: [
    "If you could wake up tomorrow with any life, what would a perfect Tuesday morning look like?",
    "What's something you've always wanted to try but haven't started yet?",
    "When you feel most alive and excited, what are you usually doing?",
    "If time and money weren't barriers, what would you spend the next year building or learning?",
  ],
  es: [
    "Si pudieras despertar manana con cualquier vida, ¿cómo sería un martes perfecto por la manana?",
    "¿Qué es algo que siempre has querido intentar pero aún no has comenzado?",
    "Cuando te sientes más vivo/a y emocionado/a, ¿qué estás haciendo normalmente?",
    "Si el tiempo y el dinero no fueran barreras, ¿qué pasarías el próximo año construyendo o aprendiendo?",
  ],
};

const CRYSTALLIZE_QUESTIONS = {
  en: [
    "You have a sense of your direction. What feels most unclear or unfinished right now?",
    "What's the one area of your vision that, if it clicked, would unlock everything else?",
  ],
  es: [
    "Tienes una idea de tu dirección. ¿Qué se siente más confuso o incompleto ahora mismo?",
    "¿Cuál es el área de tu visión que, si encajara, desbloquearía todo lo demás?",
  ],
};

/* ===== MAIN PAGE ===== */
type PageState = "intro" | "discovery" | "discovery-summary" | "crystallize" | "upload" | "choose-mode" | "analyzing" | "clarify" | "enhancing" | "results";

export default function UploadPage() {
  const { t } = useLanguage();
  const lang = t("en", "es") as "en" | "es";
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("intro");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [savedBase64, setSavedBase64] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revealedGoals, setRevealedGoals] = useState<number[]>([]);
  const [additionalGoals, setAdditionalGoals] = useState("");
  const [skippedClarify, setSkippedClarify] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"quick" | "full">("full");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Journey stage: determines which intro path to show
  const [journeyStage, setJourneyStage] = useState<"exploring" | "crystallizing" | "executing">("executing");
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Discovery flow state (exploring path)
  const [discoveryStep, setDiscoveryStep] = useState(0);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<string[]>([]);
  const [currentDiscoveryAnswer, setCurrentDiscoveryAnswer] = useState("");
  const [discoveryThemes, setDiscoveryThemes] = useState<string[]>([]);

  // Crystallize flow state (crystallizing path)
  const [crystallizeStep, setCrystallizeStep] = useState(0);
  const [crystallizeAnswers, setCrystallizeAnswers] = useState<string[]>([]);
  const [currentCrystallizeAnswer, setCurrentCrystallizeAnswer] = useState("");

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const res = await fetch(`/api/profile?userId=${session.user.id}`);
          const data = await res.json();
          if (data.profile?.journey_stage) {
            setJourneyStage(data.profile.journey_stage);
          }
        }
      } catch (e) {
        // Silently fail — default to "executing"
      }
      setProfileLoaded(true);
    }
    fetchProfile();
  }, []);

  // Extract themes from discovery answers
  function extractThemes(answers: string[]): string[] {
    const keywords = new Set<string>();
    const themePatterns: Record<string, string[]> = {
      "Career & Business": ["business", "career", "work", "job", "company", "startup", "clients", "professional", "negocio", "carrera", "trabajo"],
      "Health & Wellness": ["health", "exercise", "fitness", "yoga", "meditation", "workout", "run", "gym", "salud", "ejercicio", "bienestar"],
      "Creativity": ["art", "music", "write", "create", "paint", "design", "photograph", "creative", "arte", "música", "crear", "diseño"],
      "Travel & Adventure": ["travel", "explore", "adventure", "country", "city", "trip", "world", "viajar", "explorar", "aventura"],
      "Learning & Growth": ["learn", "study", "read", "skill", "course", "education", "grow", "aprender", "estudiar", "crecer"],
      "Relationships & Family": ["family", "friend", "love", "relationship", "community", "children", "partner", "familia", "amigo", "relación"],
      "Financial Freedom": ["money", "save", "invest", "financial", "income", "wealth", "retire", "dinero", "ahorrar", "financiero"],
      "Peace & Balance": ["peace", "calm", "balance", "nature", "morning", "routine", "mindful", "paz", "calma", "equilibrio"],
    };
    const combined = answers.join(" ").toLowerCase();
    for (const [theme, words] of Object.entries(themePatterns)) {
      if (words.some((w) => combined.includes(w))) {
        keywords.add(theme);
      }
    }
    if (keywords.size === 0) {
      keywords.add("Personal Growth");
      keywords.add("New Beginnings");
    }
    return Array.from(keywords).slice(0, 5);
  }

  const goalsWithSteps: GoalWithArea[] = analysis?.goalsWithSteps && analysis.goalsWithSteps.length > 0
    ? analysis.goalsWithSteps
    : analysis?.goals?.map((g) => ({ goal: g, steps: [] })) ?? [];

  // Stagger reveal goal cards
  useEffect(() => {
    if (pageState !== "results" || !analysis?.goalsWithSteps) return;
    setRevealedGoals([]);
    const gws = analysis.goalsWithSteps;
    gws.forEach((_: GoalWithArea, i: number) => {
      setTimeout(() => setRevealedGoals((prev) => [...prev, i]), 300 + i * 200);
    });
  }, [pageState, analysis]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    setError(null);
    setAnalysis(null);
    if (!chosen) { setFile(null); setPreview(null); return; }
    if (!chosen.type.startsWith("image/")) {
      setError(t("Please choose an image file (JPEG, PNG, GIF, or WebP).", "Por favor elige un archivo de imagen (JPEG, PNG, GIF, o WebP)."));
      setFile(null); setPreview(null); return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function handleAnalyze(mode: "quick" | "full" = "full") {
    if (!file) return;
    setAnalysisMode(mode);
    setPageState("analyzing");
    setError(null);
    try {
      const base64 = await compressImage(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg", lang, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data as AnalysisResult);
      setSavedBase64(base64);
      setBoardTitle("");
      setSaveSuccess(false);
      setRevealedGoals([]);
      setAdditionalGoals("");
      setSkippedClarify(mode === "quick");
      // Quick mode skips clarifying questions, goes straight to results
      setPageState(mode === "quick" ? "results" : "clarify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPageState("upload");
    }
  }

  async function handleEnhanceWithGoals() {
    if (!additionalGoals.trim() || !analysis) return;
    setPageState("enhancing");
    setError(null);
    try {
      const existingGoalsStr = (analysis.goalsWithSteps || [])
        .map((g: GoalWithArea) => `- ${g.goal}: ${g.steps.join(", ")}`)
        .join("\n");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enhance: true,
          existingGoals: existingGoalsStr,
          additionalGoals: additionalGoals.trim(),
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enhancement failed");

      // Merge enhanced data into analysis
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          goalsWithSteps: data.goalsWithSteps || prev.goalsWithSteps,
          summary: data.summary || prev.summary,
          insight: data.insight || prev.insight,
          goals: (data.goalsWithSteps || prev.goalsWithSteps).map((g: GoalWithArea) => g.goal),
        };
      });
      setPageState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPageState("clarify");
    }
  }

  function handleSkipClarify() {
    setSkippedClarify(true);
    setPageState("results");
  }

  function handleBackToClarify() {
    setPageState("clarify");
  }

  async function handleSaveBoard() {
    if (!savedBase64 || !analysis || saveSuccess) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setError(t("Sign in to save your board.", "Inicia sesión para guardar tu board.")); setSaving(false); return; }
      await supabase.from("vision_boards").insert({
        user_id: session.user.id,
        image_url: savedBase64,
        analysis,
        title: boardTitle.trim() || t("Untitled board", "Board sin título"),
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndChat() {
    await handleSaveBoard();
    router.push("/chat");
  }

  function handleReset() {
    setFile(null); setPreview(null); setAnalysis(null);
    setSavedBase64(null); setBoardTitle(""); setSaveSuccess(false);
    setError(null); setRevealedGoals([]);
    setAdditionalGoals(""); setSkippedClarify(false); setAnalysisMode("full");
    setDiscoveryStep(0); setDiscoveryAnswers([]);
    setCurrentDiscoveryAnswer(""); setDiscoveryThemes([]);
    setCrystallizeStep(0); setCrystallizeAnswers([]);
    setCurrentCrystallizeAnswer("");
    setPageState("intro");
    if (inputRef.current) inputRef.current.value = "";
  }

  function goToUpload() {
    setPageState("upload");
  }

  /* ===== INTRO STATE — route based on journey stage ===== */
  if (pageState === "intro") {
    // While profile is loading, show a minimal loading state
    if (!profileLoaded) {
      return (
        <div className="min-h-screen flex flex-col bg-mentiva-gradient">
          <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
            <TopNav />
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C",
              animation: "pulse 2s ease-in-out infinite",
            }} />
          </main>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }`}</style>
        </div>
      );
    }

    // Path A: Executing — brief intro then straight to upload
    if (journeyStage === "executing") {
      return (
        <div className="min-h-screen flex flex-col bg-mentiva-gradient">
          <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
            <TopNav />
          </header>
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-md" style={{ animation: "riseIn 0.8s ease both" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.5rem",
                background: "rgba(212,190,140,0.15)", border: "1px solid rgba(212,190,140,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
              }}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#D4BE8C" }} />
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                fontSize: "clamp(1.8rem, 5vw, 2.6rem)", lineHeight: 1.2,
                color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
                marginBottom: "0.6rem",
              }}>
                {t("Show me your vision", "Muéstrame tu visión")}
              </h1>
              <p style={{
                fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6,
                marginBottom: "2rem", maxWidth: 340, marginLeft: "auto", marginRight: "auto",
              }}>
                {t("Upload your board and Menti will turn it into a real plan.", "Sube tu board y Menti lo convertirá en un plan real.")}
              </p>
              <button
                onClick={goToUpload}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem",
                  border: "none", borderRadius: 60, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {t("Upload my board", "Subir mi board")} <span>{String.fromCharCode(8594)}</span>
              </button>
            </div>
          </main>
          <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      );
    }

    // Path B: Exploring — discovery prompt
    if (journeyStage === "exploring") {
      return (
        <div className="min-h-screen flex flex-col bg-mentiva-gradient">
          <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
            <TopNav />
          </header>
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-md" style={{ animation: "riseIn 0.8s ease both" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.5rem",
                background: "rgba(212,190,140,0.15)", border: "1px solid rgba(212,190,140,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
              }}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#D4BE8C" }} />
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                fontSize: "clamp(1.8rem, 5vw, 2.6rem)", lineHeight: 1.2,
                color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
                marginBottom: "0.6rem",
              }}>
                {t("Let's discover your vision together", "Descubramos tu visión juntos")}
              </h1>
              <p style={{
                fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6,
                marginBottom: "2.5rem", maxWidth: 360, marginLeft: "auto", marginRight: "auto",
              }}>
                {t(
                  "I'm going to ask you some questions, and we'll start to see what lights you up.",
                  "Voy a hacerte algunas preguntas, y empezaremos a ver qué es lo que te inspira."
                )}
              </p>
              <button
                onClick={() => { setDiscoveryStep(0); setDiscoveryAnswers([]); setCurrentDiscoveryAnswer(""); setPageState("discovery"); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem",
                  border: "none", borderRadius: 60, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {t("Let's discover", "Descubramos")} <span>{String.fromCharCode(8594)}</span>
              </button>
              <div style={{ marginTop: "1.2rem" }}>
                <button
                  onClick={goToUpload}
                  style={{
                    background: "none", border: "none", fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.35)", cursor: "pointer",
                    textDecoration: "underline", textUnderlineOffset: 3,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {t("I already have a board", "Ya tengo un board")} {String.fromCharCode(8594)}
                </button>
              </div>
            </div>
          </main>
          <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      );
    }

    // Path C: Crystallizing — sharpen prompt
    if (journeyStage === "crystallizing") {
      return (
        <div className="min-h-screen flex flex-col bg-mentiva-gradient">
          <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
            <TopNav />
          </header>
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-md" style={{ animation: "riseIn 0.8s ease both" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.5rem",
                background: "rgba(212,190,140,0.15)", border: "1px solid rgba(212,190,140,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
              }}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#D4BE8C" }} />
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                fontSize: "clamp(1.8rem, 5vw, 2.6rem)", lineHeight: 1.2,
                color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
                marginBottom: "0.6rem",
              }}>
                {t("Let's sharpen your vision", "Afinemos tu visión")}
              </h1>
              <p style={{
                fontSize: "0.95rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6,
                marginBottom: "2.5rem", maxWidth: 360, marginLeft: "auto", marginRight: "auto",
              }}>
                {t(
                  "You've got a sense of where you're headed. Let's bring it into focus.",
                  "Tienes una idea de hacia dónde vas. Vamos a darle enfoque."
                )}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", alignItems: "center" }}>
                <button
                  onClick={goToUpload}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem",
                    border: "none", borderRadius: 60, cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {t("Upload my vision board", "Subir mi vision board")} <span>{String.fromCharCode(8594)}</span>
                </button>
                <button
                  onClick={() => { setCrystallizeStep(0); setCrystallizeAnswers([]); setCurrentCrystallizeAnswer(""); setPageState("crystallize"); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "0.9rem 2rem",
                    background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.9rem",
                    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 60,
                    cursor: "pointer", transition: "all 0.3s",
                  }}
                >
                  {t("Help me clarify first", "Ayúdame a aclarar primero")} <span>{String.fromCharCode(8594)}</span>
                </button>
              </div>
            </div>
          </main>
          <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      );
    }
  }

  /* ===== DISCOVERY STATE (exploring path Q&A) ===== */
  if (pageState === "discovery") {
    const questions = DISCOVERY_QUESTIONS[lang] || DISCOVERY_QUESTIONS.en;
    const totalQuestions = questions.length;
    const currentQuestion = questions[discoveryStep];
    const isLast = discoveryStep === totalQuestions - 1;

    const handleDiscoveryNext = () => {
      const answer = currentDiscoveryAnswer.trim();
      if (!answer) return;
      const newAnswers = [...discoveryAnswers, answer];
      setDiscoveryAnswers(newAnswers);
      setCurrentDiscoveryAnswer("");

      if (isLast) {
        // Done — compute themes and show summary
        const themes = extractThemes(newAnswers);
        setDiscoveryThemes(themes);
        setPageState("discovery-summary");
      } else {
        setDiscoveryStep(discoveryStep + 1);
      }
    }

    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full flex flex-col justify-center">
          <div style={{ animation: "riseIn 0.6s ease both" }}>
            {/* Progress */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40,
              fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              marginBottom: "1.5rem", backdropFilter: "blur(8px)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
              {t(`Question ${discoveryStep + 1} of ${totalQuestions}`, `Pregunta ${discoveryStep + 1} de ${totalQuestions}`)}
            </div>

            {/* Menti Q card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.03) 100%)",
              border: "1px solid rgba(212,190,140,0.2)", borderRadius: 18,
              padding: "1.5rem", marginBottom: "1.2rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(212,190,140,0.2)", border: "1px solid rgba(212,190,140,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
                }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C" }} />
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D4BE8C" }}>
                  MENTI
                </span>
              </div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 400,
                fontSize: "1.15rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5,
              }}>
                {currentQuestion}
              </p>
            </div>

            {/* Answer input */}
            <textarea
              value={currentDiscoveryAnswer}
              onChange={(e) => setCurrentDiscoveryAnswer(e.target.value)}
              placeholder={t("Take your time... there are no wrong answers.", "Tómate tu tiempo... no hay respuestas incorrectas.")}
              rows={4}
              style={{
                ...inputStyle,
                width: "100%", borderRadius: 14, padding: "0.9rem 1rem",
                fontSize: "0.9rem", lineHeight: 1.6, resize: "vertical",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            {/* Continue button */}
            <button
              onClick={handleDiscoveryNext}
              disabled={!currentDiscoveryAnswer.trim()}
              style={{
                width: "100%", marginTop: "1rem", padding: "0.95rem 1.5rem",
                background: currentDiscoveryAnswer.trim() ? "white" : "rgba(255,255,255,0.1)",
                color: currentDiscoveryAnswer.trim() ? "#4A5C3F" : "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem",
                border: "none", borderRadius: 60, cursor: currentDiscoveryAnswer.trim() ? "pointer" : "default",
                transition: "all 0.3s",
              }}
            >
              {isLast ? t("See my themes", "Ver mis temas") : t("Continue", "Continuar")} <span>{String.fromCharCode(8594)}</span>
            </button>

            {/* Skip to upload */}
            <button
              onClick={goToUpload}
              style={{
                width: "100%", marginTop: "0.8rem", padding: "0.6rem",
                background: "none", border: "none",
                fontSize: "0.82rem", color: "rgba(255,255,255,0.3)",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t("Skip — I'll just upload a board", "Omitir — solo subiré un board")}
            </button>
          </div>
        </main>
        <style>{`
          @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        `}</style>
      </div>
    );
  }

  /* ===== DISCOVERY SUMMARY STATE ===== */
  if (pageState === "discovery-summary") {
    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full">
          <div style={{ animation: "riseIn 0.8s ease both" }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)", lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
              marginBottom: "0.5rem", textAlign: "center",
            }}>
              {t("Here's what lights you up", "Esto es lo que te inspira")}
            </h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "2rem" }}>
              {t("Themes Menti found in your answers", "Temas que Menti encontró en tus respuestas")}
            </p>

            {/* Theme tags */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "0.5rem",
              justifyContent: "center", marginBottom: "2rem",
            }}>
              {discoveryThemes.map((theme, i) => (
                <span key={i} style={{
                  padding: "8px 18px", borderRadius: 24,
                  background: "rgba(212,190,140,0.12)", border: "1px solid rgba(212,190,140,0.25)",
                  fontSize: "0.88rem", color: "#D4BE8C", fontWeight: 500,
                  animation: `riseIn 0.5s ease ${0.1 + i * 0.1}s both`,
                }}>
                  {theme}
                </span>
              ))}
            </div>

            {/* Answers recap */}
            <div style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18, padding: "1.3rem", marginBottom: "2rem",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D4BE8C", marginBottom: "0.8rem" }}>
                {t("Your reflections", "Tus reflexiones")}
              </div>
              {discoveryAnswers.map((answer, i) => (
                <div key={i} style={{
                  fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5,
                  paddingLeft: "0.8rem", borderLeft: "2px solid rgba(212,190,140,0.2)",
                  marginBottom: i < discoveryAnswers.length - 1 ? "0.8rem" : 0,
                }}>
                  {answer}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              width: "100%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(212,190,140,0.3), transparent)",
              marginBottom: "2rem",
            }} />

            {/* Next steps */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300,
              fontSize: "1.05rem", color: "rgba(255,255,255,0.5)", textAlign: "center",
              marginBottom: "1.5rem", maxWidth: 340, marginLeft: "auto", marginRight: "auto",
            }}>
              {t(
                "Now let's turn these themes into a real plan. Upload a vision board, or continue with what you've shared.",
                "Ahora convirtamos estos temas en un plan real. Sube un vision board, o continúa con lo que compartiste."
              )}
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem" }}>
              <button
                onClick={goToUpload}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem",
                  border: "none", borderRadius: 60, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {t("Upload a vision board", "Subir un vision board")} <span>{String.fromCharCode(8594)}</span>
              </button>
              <button
                onClick={() => router.push("/chat")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "0.9rem 2rem",
                  background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.2)", borderRadius: 60,
                  cursor: "pointer", transition: "all 0.3s",
                }}
              >
                {t("Continue with text", "Continuar con texto")} <span>{String.fromCharCode(8594)}</span>
              </button>
            </div>
          </div>
        </main>
        <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  /* ===== CRYSTALLIZE STATE (crystallizing path Q&A) ===== */
  if (pageState === "crystallize") {
    const questions = CRYSTALLIZE_QUESTIONS[lang] || CRYSTALLIZE_QUESTIONS.en;
    const totalQuestions = questions.length;
    const currentQuestion = questions[crystallizeStep];
    const isLast = crystallizeStep === totalQuestions - 1;

    const handleCrystallizeNext = () => {
      const answer = currentCrystallizeAnswer.trim();
      if (!answer) return;
      const newAnswers = [...crystallizeAnswers, answer];
      setCrystallizeAnswers(newAnswers);
      setCurrentCrystallizeAnswer("");

      if (isLast) {
        // Done — go to upload with context
        goToUpload();
      } else {
        setCrystallizeStep(crystallizeStep + 1);
      }
    }

    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full flex flex-col justify-center">
          <div style={{ animation: "riseIn 0.6s ease both" }}>
            {/* Progress */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40,
              fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              marginBottom: "1.5rem", backdropFilter: "blur(8px)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
              {t(`Quick question ${crystallizeStep + 1} of ${totalQuestions}`, `Pregunta rápida ${crystallizeStep + 1} de ${totalQuestions}`)}
            </div>

            {/* Menti Q card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.03) 100%)",
              border: "1px solid rgba(212,190,140,0.2)", borderRadius: 18,
              padding: "1.5rem", marginBottom: "1.2rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(212,190,140,0.2)", border: "1px solid rgba(212,190,140,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
                }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C" }} />
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D4BE8C" }}>
                  MENTI
                </span>
              </div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 400,
                fontSize: "1.15rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5,
              }}>
                {currentQuestion}
              </p>
            </div>

            {/* Answer input */}
            <textarea
              value={currentCrystallizeAnswer}
              onChange={(e) => setCurrentCrystallizeAnswer(e.target.value)}
              placeholder={t("Share what comes to mind...", "Comparte lo que se te ocurra...")}
              rows={3}
              style={{
                ...inputStyle,
                width: "100%", borderRadius: 14, padding: "0.9rem 1rem",
                fontSize: "0.9rem", lineHeight: 1.6, resize: "vertical",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            {/* Continue button */}
            <button
              onClick={handleCrystallizeNext}
              disabled={!currentCrystallizeAnswer.trim()}
              style={{
                width: "100%", marginTop: "1rem", padding: "0.95rem 1.5rem",
                background: currentCrystallizeAnswer.trim() ? "white" : "rgba(255,255,255,0.1)",
                color: currentCrystallizeAnswer.trim() ? "#4A5C3F" : "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem",
                border: "none", borderRadius: 60, cursor: currentCrystallizeAnswer.trim() ? "pointer" : "default",
                transition: "all 0.3s",
              }}
            >
              {isLast ? t("Upload my board", "Subir mi board") : t("Continue", "Continuar")} <span>{String.fromCharCode(8594)}</span>
            </button>

            {/* Skip */}
            <button
              onClick={goToUpload}
              style={{
                width: "100%", marginTop: "0.8rem", padding: "0.6rem",
                background: "none", border: "none",
                fontSize: "0.82rem", color: "rgba(255,255,255,0.3)",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t("Skip — go straight to upload", "Omitir — ir directo a subir")}
            </button>
          </div>
        </main>
        <style>{`
          @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        `}</style>
      </div>
    );
  }

  /* ===== CHOOSE MODE STATE ===== */
  if (pageState === "choose-mode") {
    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg" style={{ animation: "riseIn 0.8s ease both" }}>
            {/* Board preview thumbnail */}
            {preview && (
              <div style={{
                width: 80, height: 80, borderRadius: 16, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)", margin: "0 auto 1.5rem",
              }}>
                <img src={preview} alt="Board" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)", lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
              textAlign: "center", marginBottom: "0.5rem",
            }}>
              {t("How should Menti read this?", "¿Cómo quieres que Menti lo lea?")}
            </h1>
            <p style={{
              fontSize: "0.88rem", color: "rgba(255,255,255,0.4)", textAlign: "center",
              marginBottom: "2rem", maxWidth: 340, marginLeft: "auto", marginRight: "auto",
            }}>
              {t("Choose the depth of your analysis", "Elige la profundidad de tu análisis")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {/* Quick Look card */}
              <button
                onClick={() => handleAnalyze("quick")}
                style={{
                  width: "100%", textAlign: "left", padding: "1.3rem 1.5rem",
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 18, cursor: "pointer", transition: "all 0.3s",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
                    color: "rgba(255,255,255,0.9)",
                  }}>
                    {t("Quick look", "Vista rápida")}
                  </span>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 500, color: "rgba(255,255,255,0.4)",
                    padding: "3px 10px", background: "rgba(255,255,255,0.08)", borderRadius: 12,
                  }}>
                    ~10s
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4, margin: 0 }}>
                  {t(
                    "Your main themes and top goals in seconds",
                    "Tus temas principales y metas top en segundos"
                  )}
                </p>
              </button>

              {/* Full Analysis card */}
              <button
                onClick={() => handleAnalyze("full")}
                style={{
                  width: "100%", textAlign: "left", padding: "1.3rem 1.5rem",
                  background: "rgba(212,190,140,0.08)", border: "1px solid rgba(212,190,140,0.2)",
                  borderRadius: 18, cursor: "pointer", transition: "all 0.3s",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
                    color: "#D4BE8C",
                  }}>
                    {t("Full analysis", "Análisis completo")}
                  </span>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 500, color: "rgba(212,190,140,0.5)",
                    padding: "3px 10px", background: "rgba(212,190,140,0.1)", borderRadius: 12,
                  }}>
                    ~30s
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4, margin: 0 }}>
                  {t(
                    "Deep dive with patterns, action steps, and blind spots",
                    "Análisis profundo con patrones, pasos de acción, y más"
                  )}
                </p>
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => setPageState("upload")}
              style={{
                display: "block", width: "100%", marginTop: "1.2rem", padding: "0.6rem",
                background: "none", border: "none",
                fontSize: "0.82rem", color: "rgba(255,255,255,0.3)",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                fontFamily: "'DM Sans', sans-serif", textAlign: "center",
              }}
            >
              {t("Back", "Atrás")}
            </button>
          </div>
        </main>
        <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  /* ===== ANALYZING STATE ===== */
  if (pageState === "analyzing") return <AnalyzingScreen t={t} />;

  /* ===== ENHANCING STATE ===== */
  if (pageState === "enhancing") return <EnhancingScreen t={t} />;

  /* ===== CLARIFYING QUESTIONS STATE ===== */
  if (pageState === "clarify" && analysis) {
    const boardAreas = Array.from(new Set((analysis.goalsWithSteps || []).map((g: GoalWithArea) => g.area || "other")));

    // Suggestion chips based on what's NOT in the board
    const allAreas = ["business", "health", "finance", "relationships", "learning", "creative", "routine"];
    const missingAreas = allAreas.filter((a) => !boardAreas.includes(a));

    const areaLabels: Record<string, { en: string; es: string; color: string }> = {
      business: { en: "My career & business goals", es: "Mis metas de carrera y negocio", color: "#D4BE8C" },
      health: { en: "My health & fitness journey", es: "Mi camino de salud y ejercicio", color: "#8CB39A" },
      finance: { en: "My money & savings plans", es: "Mis planes de ahorro y dinero", color: "#B3A18C" },
      relationships: { en: "My relationships & family life", es: "Mis relaciones y vida familiar", color: "#C48B8B" },
      learning: { en: "Something I want to learn", es: "Algo que quiero aprender", color: "#8C9EB3" },
      creative: { en: "A creative project I care about", es: "Un proyecto creativo que me importa", color: "#B38CB3" },
      routine: { en: "My daily habits & routines", es: "Mis hábitos y rutinas diarias", color: "#8CB3B3" },
    };

    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full">

          {/* What Menti found */}
          <div style={{ animation: "riseIn 0.6s ease both" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40,
              fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              marginBottom: "1rem", backdropFilter: "blur(8px)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
              {t("Step 1 of 2", "Paso 1 de 2")}
            </div>

            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.5rem, 5vw, 2rem)", lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
              marginBottom: "0.5rem",
            }}>
              {t("Here's what Menti sees", "Esto es lo que Menti ve")}
            </h1>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              {analysis.summary}
            </p>
          </div>

          {/* Board thumbnail + themes found */}
          <div style={{
            display: "flex", gap: "1rem", marginBottom: "1.5rem",
            animation: "riseIn 0.6s ease 0.15s both",
          }}>
            {preview && (
              <div style={{
                width: 100, height: 100, borderRadius: 14, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0,
              }}>
                <img src={preview} alt="Board" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(212,190,140,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>
                {t("Themes found", "Temas encontrados")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {(analysis.themes || []).map((theme, i) => (
                  <span key={i} style={{
                    padding: "4px 12px", borderRadius: 20,
                    background: "rgba(212,190,140,0.12)", border: "1px solid rgba(212,190,140,0.2)",
                    fontSize: "0.8rem", color: "rgba(255,255,255,0.7)",
                  }}>
                    {theme}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(212,190,140,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginTop: "0.8rem", marginBottom: "0.4rem" }}>
                {t("Goals from board", "Metas del board")}
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                {goalsWithSteps.map((g, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: getAreaColor(g.area), flexShrink: 0 }} />
                    <span>{g.goal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: "100%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(212,190,140,0.3), transparent)",
            margin: "1.5rem 0",
          }} />

          {/* Clarifying question */}
          <div style={{ animation: "riseIn 0.6s ease 0.3s both" }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(212,190,140,0.1) 0%, rgba(212,190,140,0.03) 100%)",
              border: "1px solid rgba(212,190,140,0.2)", borderRadius: 18,
              padding: "1.3rem", marginBottom: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(212,190,140,0.2)", border: "1px solid rgba(212,190,140,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C" }} />
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D4BE8C" }}>
                  MENTI
                </span>
              </div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 400,
                fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5,
              }}>
                {t(
                  "Your board shows beautiful goals! But I want to know the full picture. What else are you working on that isn't on this board?",
                  "¡Tu board tiene metas hermosas! Pero quiero conocer todo el panorama. ¿Qué más estás trabajando que no está en este board?"
                )}
              </p>
            </div>

            {/* Suggestion chips for missing areas */}
            {missingAreas.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem" }}>
                  {t("Tap to add, or type your own below:", "Toca para agregar, o escribe abajo:")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {missingAreas.map((area) => {
                    const label = areaLabels[area];
                    if (!label) return null;
                    const text = lang === "es" ? label.es : label.en;
                    const isSelected = additionalGoals.toLowerCase().includes(text.toLowerCase());
                    return (
                      <button
                        key={area}
                        onClick={() => {
                          if (isSelected) return;
                          setAdditionalGoals((prev) =>
                            prev ? `${prev}, ${text}` : text
                          );
                        }}
                        style={{
                          padding: "6px 14px", borderRadius: 20,
                          background: isSelected ? "rgba(212,190,140,0.2)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${isSelected ? "rgba(212,190,140,0.4)" : "rgba(255,255,255,0.12)"}`,
                          fontSize: "0.82rem",
                          color: isSelected ? "#D4BE8C" : "rgba(255,255,255,0.55)",
                          cursor: isSelected ? "default" : "pointer",
                          transition: "all 0.2s",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: label.color, flexShrink: 0 }} /> {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Text area for custom input */}
            <textarea
              value={additionalGoals}
              onChange={(e) => setAdditionalGoals(e.target.value)}
              placeholder={t(
                "Tell me about other goals or dreams that weren't on your board... (e.g., I want to travel more, learn to cook, start a morning routine)",
                "Cuéntame sobre otras metas o sueños que no estaban en tu board... (ej., quiero viajar más, aprender a cocinar, empezar una rutina matutina)"
              )}
              rows={3}
              style={{
                ...inputStyle,
                width: "100%", borderRadius: 14, padding: "0.8rem 1rem",
                fontSize: "0.9rem", lineHeight: 1.5, resize: "vertical",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
              <button
                onClick={handleSkipClarify}
                style={{
                  padding: "0.9rem 1.5rem",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.88rem",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 60,
                  cursor: "pointer",
                  transition: "all 0.3s",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {t("Skip", "Omitir")}
              </button>
              <button
                onClick={handleEnhanceWithGoals}
                disabled={!additionalGoals.trim()}
                style={{
                  flex: 1, padding: "0.9rem 1.5rem",
                  background: additionalGoals.trim() ? "white" : "rgba(255,255,255,0.1)",
                  color: additionalGoals.trim() ? "#4A5C3F" : "rgba(255,255,255,0.3)",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem",
                  border: "none", borderRadius: 60, cursor: additionalGoals.trim() ? "pointer" : "default",
                  transition: "all 0.3s",
                }}
              >
                {t("Add to my goals", "Agregar a mis metas")}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-4 text-sm mt-4" style={{ background: "rgba(229,115,115,0.2)", border: "1px solid rgba(229,115,115,0.5)", color: "#ffcdd2" }}>
              {error}
            </div>
          )}
        </main>

        <style>{`
          @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        `}</style>
      </div>
    );
  }

  /* ===== RESULTS STATE ===== */
  if (pageState === "results" && analysis) {
    return (
      <div className="min-h-screen flex flex-col bg-mentiva-gradient">
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
          <TopNav />
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto w-full">

          {/* Header */}
          <div className="text-center mb-6" style={{ animation: "riseIn 0.8s ease 0.2s both" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 18px", background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40,
              fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              marginBottom: "1.5rem", backdropFilter: "blur(8px)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
              {skippedClarify
                ? t("Menti has analyzed your board", "Menti ha analizado tu board")
                : t("Your complete roadmap", "Tu hoja de ruta completa")
              }
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              fontSize: "clamp(1.8rem, 5vw, 2.6rem)", lineHeight: 1.2,
              color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
            }}>
              {skippedClarify
                ? <>{t("Menti found", "Menti encontró")} <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{goalsWithSteps.length} {t("goals", "metas")}</em><br />{t("in your vision board", "en tu vision board")}</>
                : <>{t("Your", "Tu")} <em style={{ color: "#D4BE8C", fontStyle: "italic" }}>{goalsWithSteps.length} {t("goals", "metas")}</em> {t("are ready", "están listas")}</>
              }
            </h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.45)", marginTop: "0.5rem" }}>
              {skippedClarify
                ? t("Here's your personalized roadmap", "Aquí está tu hoja de ruta personalizada")
                : t("Board + your personal goals combined", "Board + tus metas personales combinadas")
              }
            </p>
          </div>

          {/* Board thumbnail */}
          {preview && (
            <div style={{
              borderRadius: 16, overflow: "hidden", position: "relative",
              border: "1px solid rgba(255,255,255,0.15)", marginBottom: "1.5rem",
              animation: "riseIn 0.8s ease 0.4s both",
            }}>
              <img src={preview} alt="Your vision board" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(74,92,63,0.6) 0%, transparent 50%)" }} />
            </div>
          )}

          {/* Summary card */}
          <div style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 20, padding: "1.8rem", marginBottom: "1.5rem",
            backdropFilter: "blur(10px)", animation: "riseIn 0.8s ease 0.5s both",
          }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300,
              fontSize: "1.15rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6,
              marginBottom: "1.5rem", paddingBottom: "1.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
              &ldquo;{analysis.summary}&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
                fontSize: "3rem", color: "#D4BE8C", lineHeight: 1,
              }}>
                {goalsWithSteps.length}
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                <strong style={{ color: "rgba(255,255,255,0.8)", display: "block", fontSize: "1rem" }}>{t("Goals identified", "Metas identificadas")}</strong>
                {t("with action steps for each", "con pasos de acción para cada una")}
              </div>
            </div>
          </div>

          {/* Goals with steps */}
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
            fontSize: "1.4rem", color: "rgba(255,255,255,0.9)",
            marginBottom: "1rem", marginTop: "0.5rem",
          }}>
            {t("Your goals & action steps", "Tus metas y pasos de acción")}
          </h2>

          {goalsWithSteps.map((g, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, padding: "1.3rem", marginBottom: "0.8rem",
              backdropFilter: "blur(6px)",
              opacity: revealedGoals.includes(i) ? 1 : 0,
              transform: revealedGoals.includes(i) ? "translateY(0)" : "translateY(15px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.8rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: "rgba(212,190,140,0.15)", border: "1px solid rgba(212,190,140,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: getAreaColor(g.area) }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1rem", color: "rgba(255,255,255,0.9)" }}>
                    {g.goal}
                  </div>
                  {g.area && (
                    <div style={{ fontSize: "0.7rem", color: "rgba(212,190,140,0.6)", textTransform: "capitalize" as const, marginTop: 1 }}>
                      {g.area}
                    </div>
                  )}
                </div>
              </div>
              {g.steps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "0.5rem" }}>
                  {g.steps.map((step, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4BE8C", opacity: 0.5, marginTop: "0.45rem", flexShrink: 0 }} />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Menti insight */}
          {analysis.insight && (
            <div style={{
              background: "linear-gradient(135deg, rgba(212,190,140,0.08) 0%, rgba(212,190,140,0.02) 100%)",
              border: "1px solid rgba(212,190,140,0.2)", borderRadius: 16,
              padding: "1.3rem", marginTop: "1rem", marginBottom: "1.5rem",
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D4BE8C", marginBottom: "0.6rem" }}>
                {t("Menti's Insight", "Insight de Menti")}
              </div>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                {analysis.insight}
              </p>
            </div>
          )}

          {/* Edit goals button (go back to clarify) */}
          {!skippedClarify && (
            <button
              onClick={handleBackToClarify}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, width: "100%", padding: "0.7rem",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)",
                cursor: "pointer", marginBottom: "1rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ← {t("Edit my additional goals", "Editar mis metas adicionales")}
            </button>
          )}
          {skippedClarify && (
            <button
              onClick={handleBackToClarify}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, width: "100%", padding: "0.7rem",
                background: "rgba(212,190,140,0.08)", border: "1px solid rgba(212,190,140,0.15)",
                borderRadius: 14, fontSize: "0.82rem", color: "rgba(212,190,140,0.7)",
                cursor: "pointer", marginBottom: "1rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + {t("Add goals that aren't on my board", "Agregar metas que no están en mi board")}
            </button>
          )}

          {/* Name input */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
              {t("Give this board a name", "Dale un nombre a este board")}
            </div>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder={t("e.g. My 2026 Vision", "ej. Mi Visión 2026")}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ ...inputStyle, color: "white" }}
            />
          </div>

          {/* CTAs */}
          <div className="text-center" style={{ marginTop: "2rem", paddingBottom: "3rem" }}>
            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)", margin: "0 auto 1.5rem" }} />
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300,
              fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem",
              maxWidth: 320, marginLeft: "auto", marginRight: "auto",
            }}>
              {t("Your roadmap is ready. Want to dive deeper with Menti?", "Tu hoja de ruta está lista. ¿Quieres profundizar con Menti?")}
            </p>
            <button
              onClick={handleSaveAndChat}
              disabled={saving || saveSuccess}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "1rem 2rem", background: "white", color: "#4A5C3F",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem",
                border: "none", borderRadius: 60, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? t("Saving...", "Guardando...") : t("Save & Chat with Menti", "Guardar y chatear con Menti")} <span>&rarr;</span>
            </button>
            <br />
            <button
              onClick={handleSaveBoard}
              disabled={saving || saveSuccess}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "0.85rem 1.6rem", background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500, fontSize: "0.9rem",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 60,
                cursor: "pointer", marginTop: "0.8rem",
                transition: "all 0.3s",
                opacity: (saving || saveSuccess) ? 0.5 : 1,
              }}
            >
              {t("Save to my boards", "Guardar en mis boards")}
            </button>
            {saveSuccess && (
              <p style={{ color: "#D4BE8C", fontSize: "0.85rem", marginTop: "1rem" }}>
                {t("Board saved!", "¡Board guardado!")} <Link href="/dashboard" style={{ color: "#D4BE8C", textDecoration: "underline" }}>{t("View dashboard", "Ver tableros")}</Link>
              </p>
            )}
            <br />
            <button onClick={handleReset} style={{
              marginTop: "0.8rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.3)",
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 3,
            }}>
              {t("Analyze another board", "Analizar otro board")}
            </button>
          </div>

          {error && (
            <div className="rounded-xl p-4 text-sm mb-4" style={{ background: "rgba(229,115,115,0.2)", border: "1px solid rgba(229,115,115,0.5)", color: "#ffcdd2" }}>
              {error}
            </div>
          )}
        </main>

        <style>{`
          @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
        `}</style>
      </div>
    );
  }

  /* ===== UPLOAD STATE ===== */
  return (
    <div className="min-h-screen flex flex-col bg-mentiva-gradient">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
        <TopNav />
      </header>
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">
        <h1 className="font-serif font-light text-2xl sm:text-3xl" style={{ color: "rgba(255,255,255,0.9)" }}>
          {t("Upload vision board", "Sube tu vision board")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t(
            "Add an image and Menti will analyze your dreams, goals, and create your action plan",
            "Agrega una imagen y Menti analizará tus sueños, metas, y creará tu plan de acción"
          )}
        </p>

        <div className="mt-8">
          <label
            className="flex flex-col items-center justify-center min-h-[240px] rounded-xl border-2 border-dashed cursor-pointer transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.05)" }}
          >
            <span className="text-4xl mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>&#8593;</span>
            <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
              {t("Drop an image here or click to upload", "Arrastra una imagen aquí o haz click para subir")}
            </span>
            <span className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              JPEG, PNG, GIF, or WebP
            </span>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {preview && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="rounded-xl overflow-hidden shrink-0 max-w-xs" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
              <img src={preview} alt="Vision board preview" className="w-full h-auto object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPageState("choose-mode")}
                className="rounded-lg font-semibold px-5 py-3 transition-colors"
                style={{ background: "#FFFFFF", color: "#4A5C3F" }}
              >
                {t("Analyze with Menti", "Analizar con Menti")}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg px-5 py-3 transition-colors"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.22)" }}
              >
                {t("Choose different image", "Elegir otra imagen")}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl p-4 text-sm" style={{ background: "rgba(229,115,115,0.2)", border: "1px solid rgba(229,115,115,0.5)", color: "#ffcdd2" }}>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
