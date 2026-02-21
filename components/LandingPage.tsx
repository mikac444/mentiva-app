"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const STRIPE_URL = "https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01";


const ALL_IMAGES = Array.from({ length: 35 }, (_, i) => `/vision/${i + 1}.jpg`);

const CARD_SLOTS = [
  { w: 145, h: 108, top: "4%", left: "2.5%", rot: -7 },
  { w: 125, h: 95, top: "22%", left: "6%", rot: 4 },
  { w: 155, h: 115, top: "2%", right: "4%", rot: 5 },
  { w: 120, h: 90, top: "24%", right: "2%", rot: -4 },
  { w: 135, h: 100, top: "50%", left: "1.5%", rot: -2 },
  { w: 130, h: 98, top: "52%", right: "1.5%", rot: 6 },
  { w: 140, h: 105, bottom: "12%", left: "3.5%", rot: 3 },
  { w: 148, h: 110, bottom: "10%", right: "5%", rot: -5 },
];

function shuffle(arr: any[]): any[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FloatingVisionCards() {
  const [cardImages, setCardImages] = useState([] as string[]);
  const [fadingSlot, setFadingSlot] = useState(null as number | null);
  const [entered, setEntered] = useState(new Array(8).fill(false) as boolean[]);
  const queueRef = useRef([] as string[]);
  const displayedRef = useRef(new Set() as Set<string>);

  useEffect(() => {
    // Pick initial 8 random images
    const shuffled = shuffle(ALL_IMAGES);
    const initial = shuffled.slice(0, 8);
    const rest = shuffled.slice(8);
    setCardImages(initial);
    queueRef.current = rest;
    displayedRef.current = new Set(initial);

    // Staggered entrance
    initial.forEach((_, i) => {
      setTimeout(() => {
        setEntered(prev => { const n = [...prev]; n[i] = true; return n; });
      }, 300 + i * 200);
    });

    // Start cycling after entrance
    const slotOrder = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    let slotIdx = 0;

    const interval = setInterval(() => {
      const slot = slotOrder[slotIdx];
      slotIdx = (slotIdx + 1) % slotOrder.length;

      setFadingSlot(slot);

      setTimeout(() => {
        setCardImages(prev => {
          const next = [...prev];
          const oldSrc = next[slot];

          // Get next from queue
          if (queueRef.current.length === 0) {
            queueRef.current = shuffle(ALL_IMAGES.filter(i => !displayedRef.current.has(i)));
            if (queueRef.current.length === 0) {
              queueRef.current = shuffle(ALL_IMAGES.filter(i => i !== oldSrc));
            }
          }

          const newSrc = queueRef.current.shift() as string;
          displayedRef.current.delete(oldSrc);
          displayedRef.current.add(newSrc);
          next[slot] = newSrc;
          return next;
        });
        setFadingSlot(null);
      }, 800);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 40% 35% at 50% 48%, rgba(123,143,108,0.9) 0%, rgba(123,143,108,0.5) 40%, transparent 70%)",
      }} />
      {CARD_SLOTS.map((slot, i) => (
        <div
          key={i}
          className="absolute rounded-md overflow-hidden hidden sm:block"
          style={{
            width: slot.w, height: slot.h,
            top: slot.top, bottom: (slot as any).bottom,
            left: slot.left, right: slot.right,
            transform: `rotate(${slot.rot}deg)`,
            border: "3px solid rgba(255,255,255,0.45)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)",
            opacity: entered[i] ? 0.8 : 0,
            transition: "opacity 1s ease",
          }}
        >
          {cardImages[i] && (
            <img
              src={cardImages[i]}
              alt=""
              className="w-full h-full object-cover"
              style={{
                opacity: fadingSlot === i ? 0 : 1,
                transition: "opacity 0.8s ease",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [lang, setLang] = useState<"en" | "es">("en");
  const router = useRouter();

  function t(en: string, es: string) { return lang === "es" ? es : en; }

  useEffect(() => {
    // Detect language from localStorage or browser
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mentiva-lang");
      if (saved === "es" || saved === "en") { setLang(saved); }
      else if (navigator.language.startsWith("es")) { setLang("es"); }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // Check current session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
    // Also listen for auth state changes (catches mobile OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace('/dashboard');
      }
    });
    // Fetch member count
    supabase.from("allowed_emails").select("id", { count: "exact", head: true }).then(({ count }) => {
      if (count !== null) setMemberCount(count);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("mentiva_early_access_email", trimmed);
      window.location.href = `${STRIPE_URL}?prefilled_email=${encodeURIComponent(trimmed)}`;
    }
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)'
      }} />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #A1B392 0%, #6B7F5E 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl animate-[drift_20s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #D4BE8C 0%, transparent 70%)",
            top: "10%",
            left: "10%",
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
            top: "60%",
            right: "15%",
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full opacity-25 blur-2xl animate-[drift_18s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #D4BE8C 0%, transparent 70%)",
            bottom: "20%",
            left: "30%",
          }}
        />
      </div>

      <style>{`
        @keyframes cardFloat {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(4px, -6px); }
          66% { transform: translate(-3px, 4px); }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 0.4; }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-15px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
      `}</style>


      <FloatingVisionCards />
      <header className="relative z-10 pt-8 pb-4 flex items-center justify-center">
        <p
          className="text-center font-serif font-light tracking-[0.35em] uppercase"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}
        >
          MENTIVA
        </p>
        {/* Language toggle */}
        <button
          onClick={() => {
            const next = lang === "en" ? "es" : "en";
            setLang(next);
            if (typeof window !== "undefined") localStorage.setItem("mentiva-lang", next);
          }}
          className="absolute right-4 sm:right-8 font-sans text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}
        >
          {lang === "en" ? "ES" : "EN"}
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-[rise_0.8s_ease-out_both]">
          <h1
            className="font-serif font-light leading-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {t("Your vision board, with a brain.", "Tu vision board, con cerebro.")}
          </h1>

          <p
            className="font-serif italic font-light"
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.125rem" }}
          >
            {t(
              "Dreams don\u2019t need more pins. They need a mentor.",
              "Los sue\u00f1os no necesitan m\u00e1s pines. Necesitan un mentor."
            )}
          </p>

          <p
            className="font-sans font-light max-w-lg mx-auto"
            style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.6 }}
          >
            {t(
              "Upload photos of your dream life. AI turns them into a personalized action plan and coaches you there daily.",
              "Sube fotos de tu vida so\u00f1ada. La IA las convierte en un plan de acci\u00f3n personalizado y te gu\u00eda todos los d\u00edas."
            )}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-2 justify-center items-stretch sm:items-center max-w-md mx-auto animate-[rise_0.8s_ease-out_0.2s_both]"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("Enter your email", "Ingresa tu email")}
              required
              className="flex-1 min-w-0 px-5 py-3.5 rounded-full bg-white/15 backdrop-blur-md border border-white/40 text-white placeholder-white/60 font-sans text-sm outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 px-6 py-3.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white font-sans font-medium text-sm hover:bg-white/30 transition-colors disabled:opacity-70"
            >
              {t("Get Early Access", "Acceso Anticipado")} {String.fromCharCode(8594)}
            </button>
          </form>

          <div
            className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-sm animate-[rise_0.8s_ease-out_0.3s_both]"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            <span>
              <span className="line-through opacity-70">$99/{t("yr", "a\u00f1o")}</span>{" "}
              <span className="font-medium">$10 {t("forever", "para siempre")}</span>
            </span>
            <span>{t("Founding members only", "Solo miembros fundadores")}</span>
            {memberCount !== null && (
              <span>{memberCount} {t("of 30 spots claimed", "de 30 lugares tomados")}</span>
            )}
          </div>

          {/* Login link for existing members */}
          <div className="animate-[rise_0.8s_ease-out_0.35s_both]">
            <a
              href="/login"
              className="inline-block font-sans text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              {t("Already a member? Sign in", "Ya eres miembro? Inicia sesi\u00f3n")}
            </a>
          </div>
        </div>
      </main>

      <footer
        className="relative z-10 py-6 text-center font-sans text-sm animate-[rise_0.8s_ease-out_0.4s_both]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {String.fromCharCode(169)} 2026 Mentiva
      </footer>

      <style>{`
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
