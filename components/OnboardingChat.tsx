"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language";

type OnboardingChatProps = {
  firstName: string;
  userId: string;
  memberNumber: number | null;
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type SummaryCard = {
  identityStatement: string;
  keyInsights: string[];
  mentiApproach: string;
  closingLine: string;
};

const BG = "radial-gradient(ellipse 70% 50% at 75% 15%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 50% 0%, rgba(185,205,170,0.35) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(139,158,124,0.1) 0%, transparent 50%), linear-gradient(175deg, #A1B392 0%, #93A684 20%, #869978 40%, #7A8E6C 70%, #6B7F5E 100%)";

export function OnboardingChat({ firstName, userId, memberNumber }: OnboardingChatProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [phase, setPhase] = useState<"welcome" | "depth-choice" | "chat" | "summary">("welcome");
  const [numberRevealed, setNumberRevealed] = useState(false);
  const [depth, setDepth] = useState<"deep" | "quick">("deep");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({});
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Summary state
  const [summary, setSummary] = useState<SummaryCard | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setNumberRevealed(true), 600);
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, suggestedResponses]);

  // Fade-in messages one at a time
  useEffect(() => {
    if (visibleCount < messages.length) {
      const t = setTimeout(() => setVisibleCount(messages.length), 80);
      return () => clearTimeout(t);
    }
  }, [messages.length, visibleCount]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setSuggestedResponses([]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, collectedData, userName: firstName, depth, lang }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = { role: "assistant", content: data.message };
      setMessages((prev) => [...prev, assistantMsg]);
      setCollectedData(data.collectedData || collectedData);
      setSuggestedResponses(data.suggestedResponses || []);

      if (data.readyToComplete) {
        // Complete onboarding
        setLoading(true);
        const completeRes = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            userName: firstName,
            collectedData: data.collectedData || collectedData,
            messages: [...next, assistantMsg],
            lang,
          }),
        });
        const completeData = await completeRes.json();
        setSummary(completeData.summaryCard);
        setPhase("summary");
        setTimeout(() => setSummaryVisible(true), 100);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Let me try that again..." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, collectedData, firstName, userId, depth, lang]);

  function startChat(chosenDepth: "deep" | "quick") {
    setDepth(chosenDepth);
    setPhase("chat");
    // Send initial message to get conversation started
    setLoading(true);
    fetch("/api/onboarding/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], collectedData: {}, userName: firstName, depth: chosenDepth, lang }),
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages([{ role: "assistant", content: data.message }]);
        setSuggestedResponses(data.suggestedResponses || []);
        setCollectedData(data.collectedData || {});
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: `Hey ${firstName}! I'm Menti. I'd love to get to know you a bit. What's on your mind these days?` }]);
      })
      .finally(() => setLoading(false));
  }

  function finishOnboarding(dest: "upload" | "dashboard") {
    localStorage.setItem("mentiva_onboarding_done", "true");
    router.push("/" + dest);
  }

  // --- PHASE 1: Welcome ---
  if (phase === "welcome") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: BG, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Orbs />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40, fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "2.5rem", backdropFilter: "blur(8px)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4BE8C", animation: "pulse 2s ease-in-out infinite" }} />
            Founding Member
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(2.4rem, 8vw, 3.8rem)", lineHeight: 1.15, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            Welcome to<br />Mentiva, <span style={{ color: "#D4BE8C", fontStyle: "italic" }}>{firstName}</span>
          </h1>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "clamp(3.5rem, 12vw, 5.5rem)", color: "#D4BE8C", lineHeight: 1,
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
          <button onClick={() => setPhase("depth-choice")} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
            border: "none", borderRadius: 60, cursor: "pointer", marginTop: "2.5rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            Let&apos;s get to know each other <span>&rarr;</span>
          </button>
        </div>
        <Animations />
      </div>
    );
  }

  // --- PHASE 1.5: Depth Choice ---
  if (phase === "depth-choice") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: BG, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Orbs />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            fontSize: "clamp(1.6rem, 5vw, 2.2rem)", lineHeight: 1.25,
            color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
            marginBottom: "2.5rem", maxWidth: 380,
          }}>
            How would you like us to get to know each other?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 340 }}>
            <button onClick={() => startChat("deep")} style={{
              padding: "1.4rem 1.6rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 20, backdropFilter: "blur(12px)",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.05rem", color: "rgba(255,255,255,0.95)", marginBottom: 6 }}>
                Let&apos;s take our time
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                ~15-20 min &mdash; I&apos;ll really get to know you
              </div>
            </button>
            <button onClick={() => startChat("quick")} style={{
              padding: "1.4rem 1.6rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 20, backdropFilter: "blur(12px)",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.05rem", color: "rgba(255,255,255,0.95)", marginBottom: 6 }}>
                Quick intro
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                ~5 min &mdash; we can always go deeper later
              </div>
            </button>
          </div>
        </div>
        <Animations />
      </div>
    );
  }

  // --- PHASE 2: Chat ---
  if (phase === "chat") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: BG, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Orbs />
        {/* Header */}
        <div style={{ padding: "1rem 1.5rem", textAlign: "center", position: "relative", zIndex: 2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
            Getting to know you
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 400, color: "rgba(255,255,255,0.9)" }}>
            Talk to Menti
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "1rem 1rem 0", position: "relative", zIndex: 1, WebkitOverflowScrolling: "touch" }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const visible = i < visibleCount;
            return (
              <div key={i} style={{
                display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: "0.75rem",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                <div style={{
                  maxWidth: "80%", padding: "0.8rem 1rem",
                  background: isUser ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  border: `1px solid rgba(255,255,255,${isUser ? "0.2" : "0.15"})`,
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  backdropFilter: "blur(10px)",
                  fontSize: "0.92rem", lineHeight: 1.55,
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{
                padding: "0.8rem 1.2rem",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "16px 16px 16px 4px",
                backdropFilter: "blur(10px)",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "rgba(255,255,255,0.5)",
                    animation: `dotBounce 1.2s ease-in-out ${d * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Suggested responses */}
          {!loading && suggestedResponses.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0.5rem 0 1rem", justifyContent: "flex-end" }}>
              {suggestedResponses.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 40, cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.25s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "0.75rem 1rem 1.5rem", position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim() && !loading) sendMessage(inputValue.trim()); }} style={{ display: "flex", gap: 8 }}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              style={{
                flex: 1, padding: "0.8rem 1rem",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24, outline: "none",
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif",
                backdropFilter: "blur(10px)",
              }}
            />
            <button type="submit" disabled={loading || !inputValue.trim()} style={{
              width: 44, height: 44, borderRadius: "50%",
              background: inputValue.trim() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: inputValue.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </form>
        </div>
        <Animations />
      </div>
    );
  }

  // --- PHASE 3: Summary ---
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: BG, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <Orbs />
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "2.5rem 1.5rem", position: "relative", zIndex: 1,
        opacity: summaryVisible ? 1 : 0,
        transform: summaryVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.6rem, 5vw, 2.2rem)", color: "rgba(255,255,255,0.9)", textAlign: "center", marginBottom: "1.8rem", letterSpacing: "-0.02em" }}>
          Here&apos;s what I learned about you
        </h2>

        {summary && (
          <div style={{
            maxWidth: 400, width: "100%", padding: "1.8rem 1.5rem",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 20, backdropFilter: "blur(10px)",
          }}>
            {/* Identity statement */}
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 400, color: "#D4BE8C", lineHeight: 1.4, marginBottom: "1.2rem", textAlign: "center" }}>
              {summary.identityStatement}
            </p>

            {/* Key insights */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.2rem" }}>
              {summary.keyInsights.map((insight, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: "0.6rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
                  <span style={{ color: "#D4BE8C", flexShrink: 0, marginTop: 2 }}>&#8226;</span>
                  {insight}
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "1rem 0" }} />

            {/* Menti approach */}
            <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "1rem", fontFamily: "'DM Sans', sans-serif" }}>
              {summary.mentiApproach}
            </p>

            {/* Closing line */}
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
              {summary.closingLine}
            </p>
          </div>
        )}

        <button onClick={() => finishOnboarding("upload")} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "1rem 2.2rem", background: "white", color: "#4A5C3F",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1rem",
          border: "none", borderRadius: 60, cursor: "pointer", marginTop: "2rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          Continue to my vision <span>&rarr;</span>
        </button>
        <button onClick={() => finishOnboarding("dashboard")} style={{
          marginTop: "1rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.35)",
          background: "none", border: "none", cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 3,
        }}>
          I&apos;ll explore first
        </button>
      </div>
      <Animations />
    </div>
  );
}

/* Shared decorative orbs */
function Orbs() {
  return (
    <>
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(196,168,107,0.35)", top: "-5%", left: "-10%", animation: "drift1 20s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(255,255,255,0.2)", bottom: "-5%", right: "-5%", animation: "drift2 18s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", filter: "blur(80px)", opacity: 0.12, background: "rgba(185,205,170,0.25)", top: "40%", right: "-8%", animation: "drift3 22s ease-in-out infinite", pointerEvents: "none" }} />
    </>
  );
}

/* CSS keyframe animations injected once */
function Animations() {
  return (
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
      @keyframes dotBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
  );
}
