"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type OnboardingProps = {
  firstName: string;
  memberNumber: number | null;
};

export function Onboarding({ firstName, memberNumber }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [numberRevealed, setNumberRevealed] = useState(false);
  const touchStartX = useRef(0);
  const router = useRouter();
  const totalSlides = 3;

  useEffect(() => {
    setTimeout(() => setNumberRevealed(true), 600);
  }, []);

  useEffect(() => {
    if (currentSlide === 1) {
      setStepsVisible(true);
    }
  }, [currentSlide]);

  function goToSlide(n: number) {
    setCurrentSlide(n);
  }

  function nextSlide() {
    if (currentSlide < totalSlides - 1) {
      goToSlide(currentSlide + 1);
    }
  }

  function finish(destination: string) {
    localStorage.setItem("mentiva_onboarding_done", "true");
    router.push("/" + destination);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
      else if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1);
    }
  }

  const bgStyle = {
    background: "radial-gradient(ellipse 70% 50% at 75% 15%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 50% 0%, rgba(185,205,170,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(139,158,124,0.1) 0%, transparent 50%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, ...bgStyle, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Orbs */}
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(196,168,107,0.35)", top: "-5%", left: "-10%", animation: "drift1 20s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(255,255,255,0.2)", bottom: "-5%", right: "-5%", animation: "drift2 18s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(185,205,170,0.25)", top: "40%", right: "-8%", animation: "drift3 22s ease-in-out infinite", pointerEvents: "none" }} />

      {/* Slides */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: "flex",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: `translateX(-${currentSlide * 100}%)`,
          willChange: "transform",
        }}
      >
        {/* SLIDE 1: Welcome */}
        <div style={{ minWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40, fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "2.5rem", backdropFilter: "blur(8px)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
            Founding Member
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(2.4rem, 8vw, 3.8rem)", lineHeight: 1.15, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            Welcome to<br />Mentiva, <span style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</span>
          </h1>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "clamp(3.5rem, 12vw, 5.5rem)",
            color: "#D4BE8C",
            lineHeight: 1,
            margin: "1.5rem 0 0.5rem",
            opacity: numberRevealed ? 1 : 0,
            transform: numberRevealed ? "scale(1)" : "scale(0.8)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            #{memberNumber ?? "--"}
          </div>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
            of <strong style={{ color: "rgba(255,255,255,0.5)" }}>3,000</strong> founding members
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 300, fontSize: "1.15rem", color: "rgba(255,255,255,0.45)", marginTop: "2rem", maxWidth: 320 }}>
            Let&apos;s turn your dreams into a plan.
          </p>
        </div>

        {/* SLIDE 2: How it works */}
        <div style={{ minWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", position: "relative", zIndex: 1, textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(2rem, 6vw, 3rem)", color: "rgba(255,255,255,0.95)", marginBottom: "2.5rem", letterSpacing: "-0.02em" }}>
            How Mentiva works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", maxWidth: 340, width: "100%" }}>
            {[
              { num: "1", text: <><strong>Upload</strong> your vision board</> },
              { num: "2", text: <><strong>Menti analyzes</strong> your dreams and goals</> },
              { num: "3", text: <>Get a <strong>personalized action plan</strong></> },
              { num: "4", text: <><strong>Daily coaching</strong> to stay on track</> },
            ].map((step, i) => (
              <div key={i}>
                {i > 0 && <div style={{ display: "flex", justifyContent: "center", margin: "-0.4rem 0", color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>|</div>}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.2rem",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  backdropFilter: "blur(8px)",
                  textAlign: "left" as const,
                  opacity: stepsVisible ? 1 : 0,
                  transform: stepsVisible ? "translateX(0)" : "translateX(-20px)",
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "1.1rem", color: "#D4BE8C", flexShrink: 0 }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", fontWeight: 400, lineHeight: 1.4 }}>
                    {step.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLIDE 3: Let's go */}
        <div style={{ minWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{
            width: 110, height: 110, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,190,140,0.5) 0%, rgba(212,190,140,0.15) 45%, transparent 70%)",
            border: "1px solid rgba(212,190,140,0.35)",
            marginBottom: "2.5rem",
            animation: "glowPulse 3s ease-in-out infinite",
            position: "relative",
            boxShadow: "0 0 40px rgba(212,190,140,0.15), 0 0 80px rgba(212,190,140,0.08)",
          }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(2rem, 6vw, 3rem)", color: "rgba(255,255,255,0.95)", marginBottom: "0.6rem", letterSpacing: "-0.02em" }}>
            Your dreams are waiting.
          </h2>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", marginBottom: "2.5rem", maxWidth: 300, lineHeight: 1.5 }}>
            Let&apos;s go for what moves your heart. Upload your vision board and Menti will light the way.
          </p>
          <button onClick={() => finish("upload")} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
            border: "none", borderRadius: 60, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            Upload my vision board <span>&rarr;</span>
          </button>
          <button onClick={() => finish("dashboard")} style={{
            marginTop: "1.2rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.35)",
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}>
            I&apos;ll explore first
          </button>
        </div>
      </div>

      {/* Nav dots */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "2rem 0 3rem", position: "relative", zIndex: 2 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} onClick={() => goToSlide(i)} style={{
            width: currentSlide === i ? 24 : 8,
            height: 8,
            borderRadius: currentSlide === i ? 4 : "50%",
            background: currentSlide === i ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
            cursor: "pointer",
            transition: "all 0.4s ease",
          }} />
        ))}
      </div>

      {/* Next button */}
      {currentSlide < totalSlides - 1 && (
        <button onClick={nextSlide} style={{
          position: "absolute", bottom: "3.5rem", right: "2rem",
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: "1.2rem",
          transition: "all 0.3s", zIndex: 5,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.08); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -15px) scale(1.05); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 10px) scale(0.95); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
