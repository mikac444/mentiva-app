"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const STRIPE_URL = "https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

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


      {/* Floating vision board cards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {/* Vignette to keep center readable */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 45% 40% at 50% 48%, rgba(123,143,108,0.95) 0%, rgba(123,143,108,0.75) 35%, rgba(123,143,108,0.2) 60%, transparent 80%)",
        }} />
        {[
          { src: "/vision/1.jpg", w: 145, h: 108, top: "4%", left: "2.5%", rot: -7, delay: 0 },
          { src: "/vision/5.jpg", w: 125, h: 95, top: "22%", left: "6%", rot: 4, delay: 0.3 },
          { src: "/vision/11.jpg", w: 155, h: 115, top: "2%", right: "4%", rot: 5, delay: 0.6 },
          { src: "/vision/15.jpg", w: 120, h: 90, top: "24%", right: "2%", rot: -4, delay: 0.9 },
          { src: "/vision/20.jpg", w: 135, h: 100, top: "50%", left: "1.5%", rot: -2, delay: 1.2 },
          { src: "/vision/22.jpg", w: 130, h: 98, top: "52%", right: "1.5%", rot: 6, delay: 1.5 },
          { src: "/vision/27.jpg", w: 140, h: 105, bottom: "12%", left: "3.5%", rot: 3, delay: 1.8 },
          { src: "/vision/33.jpg", w: 148, h: 110, bottom: "10%", right: "5%", rot: -5, delay: 2.1 },
        ].map((card, i) => (
          <div
            key={i}
            className="absolute rounded-md overflow-hidden hidden sm:block"
            style={{
              width: card.w,
              height: card.h,
              top: card.top,
              bottom: (card as any).bottom,
              left: card.left,
              right: card.right,
              transform: `rotate(${card.rot}deg)`,
              border: "3px solid rgba(255,255,255,0.45)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)",
              opacity: 0,
              animation: `cardFloat 20s ease-in-out infinite, cardEnter 0.8s ease-out ${card.delay}s forwards`,
              animationDelay: `${card.delay}s`,
            }}
          >
            <img src={card.src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <header className="relative z-10 pt-8 pb-4">
        <p
          className="text-center font-serif font-light tracking-[0.35em] uppercase"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}
        >
          MENTIVA
        </p>
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
            Your vision board, with a brain.
          </h1>

          <p
            className="font-serif italic font-light"
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.125rem" }}
          >
            Dreams don&apos;t need more pins. They need a mentor.
          </p>

          <p
            className="font-sans font-light max-w-lg mx-auto"
            style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.6 }}
          >
            Upload photos of your dream life. AI turns them into a personalized action plan and coaches you there daily.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-2 justify-center items-stretch sm:items-center max-w-md mx-auto animate-[rise_0.8s_ease-out_0.2s_both]"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 min-w-0 px-5 py-3.5 rounded-full bg-white/15 backdrop-blur-md border border-white/40 text-white placeholder-white/60 font-sans text-sm outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 px-6 py-3.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white font-sans font-medium text-sm hover:bg-white/30 transition-colors disabled:opacity-70"
            >
              Get Early Access →
            </button>
          </form>

          <div
            className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-sm animate-[rise_0.8s_ease-out_0.3s_both]"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            <span>
              <span className="line-through opacity-70">$99/yr</span>{" "}
              <span className="font-medium">$10 forever</span>
            </span>
            <span>Founding members only</span>
            <span>23 of 3,000 spots claimed</span>
          </div>
        </div>
      </main>

      <footer
        className="relative z-10 py-6 text-center font-sans text-sm animate-[rise_0.8s_ease-out_0.4s_both]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        © 2026 Mentiva · Austin, TX
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
