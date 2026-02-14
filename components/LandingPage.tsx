"use client";

import { useState } from "react";

const STRIPE_URL = "https://buy.stripe.com/14AeVc6QzbR11wv7DUf3a01";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-15px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
      `}</style>

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
