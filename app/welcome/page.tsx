"use client";

import { useEffect, useState } from "react";

const MENTIVA_URL = "https://mentiva.app";

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h = h & h;
  }
  return h;
}

function referralCodeFromEmail(email: string): string {
  const hash = simpleHash(email.toLowerCase());
  const base36 = Math.abs(hash).toString(36);
  return "M" + base36.slice(0, 4);
}

export default function WelcomePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("M----");
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [spotsClaimed, setSpotsClaimed] = useState<number>(0);
  const [referralCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mentiva_early_access_email") : null;
    if (stored) {
      setEmail(stored);
      setReferralCode(referralCodeFromEmail(stored));
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setLoading(false);
      if (!stored) setMemberNumber(null);
      return;
    }

    (async () => {
      try {
        const emailsRes = await fetch(
          `${url}/rest/v1/allowed_emails?order=created_at.asc&select=email`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } }
        );
        if (!emailsRes.ok) {
          setLoading(false);
          return;
        }
        const emails = await emailsRes.json() as { email: string }[];
        setSpotsClaimed(emails.length);

        if (stored) {
          const normalized = stored.toLowerCase();
          const index = emails.findIndex((r) => r.email.toLowerCase() === normalized);
          setMemberNumber(index >= 0 ? index + 1 : null);
        } else {
          setMemberNumber(null);
        }
      } catch (e) {
        console.error("Failed to load member data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const referralLink = `${MENTIVA_URL}?ref=${referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent("I just joined Mentiva - turn your vision board into an actionable plan with AI. Founding members: $10 forever.");
  const shareUrl = encodeURIComponent(referralLink);
  const shareButtons = [
    { label: "Text", url: `sms:?body=${shareText}` },
    { label: "WhatsApp", url: `https://wa.me/?text=${shareText}` },
    { label: "IG Story", url: `https://www.instagram.com/stories/create` },
    { label: "X Post", url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}` },
    { label: "Email", url: `mailto:?subject=Mentiva - Vision board with a brain&body=${shareText}%20${shareUrl}` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #A1B392 0%, #6B7F5E 100%)" }}>
        <div className="text-white/80 font-sans">Loading...</div>
      </div>
    );
  }

  const displayMemberNumber = memberNumber !== null ? memberNumber : "--";

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #A1B392 0%, #6B7F5E 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl animate-[drift_20s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle, #D4BE8C 0%, transparent 70%)", top: "10%", left: "10%" }} />
        <div className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)", top: "60%", right: "15%" }} />
      </div>
      <style>{`@keyframes drift { 0%,100%{transform:translate(0,0)} 25%{transform:translate(20px,-30px)} 50%{transform:translate(-15px,20px)} 75%{transform:translate(30px,10px)} }`}</style>

      <header className="relative z-10 pt-8 pb-4">
        <p className="text-center font-serif font-light tracking-[0.35em] uppercase" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
          MENTIVA
        </p>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-xl mx-auto text-center space-y-8 animate-[rise_0.8s_ease-out_both]">
          <h1 className="font-serif font-light text-3xl sm:text-4xl" style={{ color: "rgba(255,255,255,0.95)" }}>
            Welcome, Founding Member.
          </h1>

          <div className="animate-[scaleIn_0.6s_ease-out_0.3s_both]" style={{ color: "#D4BE8C" }}>
            <span className="font-serif text-6xl sm:text-7xl font-light">#{displayMemberNumber}</span>
          </div>

          <div className="space-y-2">
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {spotsClaimed} of 3,000 spots claimed
            </p>
            <div className="h-1 rounded-full bg-white/20 max-w-xs mx-auto overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4BE8C] transition-all duration-500"
                style={{ width: `${Math.min(100, (spotsClaimed / 3000) * 100)}%` }}
              />
            </div>
          </div>

          <p className="font-serif italic font-light" style={{ color: "rgba(255,255,255,0.8)" }}>
            You&apos;re one of the first. Now help us spread the vision.
          </p>

          <div className="space-y-3">
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              Your referral link:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 px-4 py-3 rounded-full bg-white/15 backdrop-blur-md border border-white/40 font-sans text-sm text-white truncate">
                {referralLink}
              </div>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 px-5 py-3 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white font-sans text-sm hover:bg-white/30 transition-colors"
              >
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {shareButtons.map((b) => (
              <a
                key={b.label}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/40 text-white font-sans text-xs hover:bg-white/25 transition-colors"
              >
                {b.label}
              </a>
            ))}
          </div>

          <div className="pt-6 space-y-4 text-left max-w-sm mx-auto">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="font-sans font-medium text-sm text-white">3 referrals</p>
              <p className="font-sans text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Get your $10 back</p>
              <p className="font-serif italic text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Refer 3 friends, lifetime access for free</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="font-sans font-medium text-sm text-white">5 referrals</p>
              <p className="font-sans text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Gift a free membership</p>
              <p className="font-serif italic text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Give lifetime access to someone you love</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="font-sans font-medium text-sm text-white">10 referrals</p>
              <p className="font-sans text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>1-on-1 vision session</p>
              <p className="font-serif italic text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>30-minute private session with our founder</p>
            </div>
          </div>

          <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            You&apos;ve referred {referralCount} {referralCount === 1 ? "person" : "people"} so far
          </p>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center font-sans text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        © 2026 Mentiva · Austin, TX
      </footer>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
