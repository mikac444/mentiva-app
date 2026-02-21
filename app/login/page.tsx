"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

const translations = {
  en: {
    tagline: "Your vision board, with a brain.",
    cta: "Continue with Google",
    founding: "Not a member yet? \u00b7 $10 before it\u2019s gone",
    lang: "ES",
  },
  es: {
    tagline: "Tu tablero de visi\u00f3n, con cerebro.",
    cta: "Continuar con Google",
    founding: "\u00bfA\u00fan no eres miembro? \u00b7 $10 antes de que se acabe",
    lang: "EN",
  },
};

const WORDS_EN = ["dreaming", "wishing", "pinning", "waiting", "planning"];
const WORDS_ES = ["so\u00f1ar", "desear", "planear", "esperar", "imaginar"];

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { lang, setLang } = useLanguage();
  const [phase, setPhase] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [showWord, setShowWord] = useState(true);
  const t = translations[lang];
  const words = lang === "en" ? WORDS_EN : WORDS_ES;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace('/dashboard');
          return;
        }
      } catch (e) {}
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (checking) return;
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [checking]);

  useEffect(() => {
    if (checking) return;
    const interval = setInterval(() => {
      setShowWord(false);
      setTimeout(() => {
        setWordIdx((i) => (i + 1) % words.length);
        setShowWord(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, [checking, lang, words.length]);

  async function handleGoogleSignIn() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://mentiva.app/auth/callback?redirectTo=%2Fdashboard",
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      console.error("Google sign in error:", error);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  if (checking) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "2rem", color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em",
          }}>
            mentiva
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 6 }}>
            {[0, 1, 2].map((d) => (
              <span key={d} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "rgba(255,255,255,0.4)",
                animation: `pulse 1.2s ease-in-out ${d * 0.15}s infinite`,
              }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(1); } 40% { opacity: 1; transform: scale(1.3); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === "en" ? "es" : "en")}
        style={{
          position: "fixed", top: 24, right: 28, zIndex: 60,
          padding: "7px 16px", borderRadius: 22,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 600,
          letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.3s",
          display: "flex", alignItems: "center", gap: 6,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {t.lang}
      </button>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "2rem 1.5rem",
      }}>
        <p style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 300,
          fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.5em", textTransform: "uppercase",
          marginBottom: 40,
          opacity: phase >= 1 ? 1 : 0, transition: "opacity 1s ease",
        }}>MENTIVA</p>

        <p style={{
          fontSize: "0.78rem", letterSpacing: "0.15em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", marginBottom: 12, height: 20,
          opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.8s ease",
        }}>
          {lang === "en" ? "Beyond just " : "M\u00e1s que solo "}
          <span style={{
            display: "inline-block", color: "rgba(212,190,140,0.7)", fontWeight: 600,
            opacity: showWord ? 1 : 0, transform: showWord ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.4s ease", minWidth: 70,
          }}>{words[wordIdx]}</span>
        </p>

        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 500,
          fontSize: "clamp(2rem, 5.5vw, 3.2rem)",
          color: "rgba(255,255,255,0.93)", textAlign: "center", marginBottom: 12,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {lang === "en" ? "Start becoming." : "Empieza a ser."}
        </h1>

        <p style={{
          fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400,
          fontSize: "0.92rem", color: "rgba(255,255,255,0.4)",
          marginBottom: 48, textAlign: "center",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.8s ease",
        }}>{t.tagline}</p>

        <button
          onClick={handleGoogleSignIn}
          style={{
            width: "100%", maxWidth: 340,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "16px 28px", borderRadius: 16,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.92)", fontSize: "0.9rem", fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)",
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)"; }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" style={{ opacity: 0.85 }}>
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t.cta}
        </button>

        <div style={{
          marginTop: 36, opacity: phase >= 5 ? 1 : 0,
          transform: phase >= 5 ? "translateY(0)" : "translateY(8px)",
          transition: "all 1s ease",
        }}>
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 18px", borderRadius: 24,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            textDecoration: "none", cursor: "pointer", transition: "all 0.3s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "rgba(212,190,140,0.6)",
              boxShadow: "0 0 10px rgba(212,190,140,0.3)",
            }} />
            <span style={{
              fontSize: "0.72rem", fontWeight: 500,
              color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em",
            }}>{t.founding}</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function LoginFallback() {
  return null;
}

export default function LoginPage() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      overflow: "hidden",
      background: "linear-gradient(165deg, #B8C9A8 0%, #9BAE8B 25%, #8DA07D 45%, #7A8E6C 65%, #6B7F5E 85%, #5C7050 100%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes breatheA {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes breatheB {
          0%, 100% { transform: scale(1.1); opacity: 0.3; }
          50% { transform: scale(0.9); opacity: 0.55; }
        }
        @keyframes pulseRing {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.08; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.08; }
        }
      `}</style>

      {/* Noise */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
      }} />

      {/* Orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)", top: "-8%", right: "-5%", filter: "blur(40px)", animation: "breatheA 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,220,180,0.18) 0%, transparent 60%)", bottom: "-10%", left: "-5%", filter: "blur(45px)", animation: "breatheB 16s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,190,140,0.1) 0%, transparent 55%)", top: "35%", left: "18%", filter: "blur(40px)", animation: "breatheA 18s ease-in-out infinite 4s" }} />
      </div>

      {/* Rings */}
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 600, height: 600, border: "1px solid rgba(255,255,255,0.05)", borderRadius: "50%", animation: "pulseRing 10s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 400, height: 400, border: "1px solid rgba(255,255,255,0.04)", borderRadius: "50%", animation: "pulseRing 10s ease-in-out infinite 3s" }} />

      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
