"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";

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
  const { t } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("M----");
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [spotsClaimed, setSpotsClaimed] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || localStorage.getItem("mentiva_early_access_email");

      if (userEmail) {
        setEmail(userEmail);
        setReferralCode(referralCodeFromEmail(userEmail));
      }

      // Fetch member data
      try {
        const { data: emails } = await supabase
          .from("allowed_emails")
          .select("email")
          .order("created_at", { ascending: true });

        if (emails) {
          setSpotsClaimed(emails.length);
          if (userEmail) {
            const normalized = userEmail.toLowerCase();
            const index = emails.findIndex((r) => r.email.toLowerCase() === normalized);
            setMemberNumber(index >= 0 ? index + 1 : null);
          }
        }

        // Fetch referral count
        if (userEmail) {
          const code = referralCodeFromEmail(userEmail);
          const { data: referrals, error: refError } = await supabase
            .from("referrals")
            .select("id")
            .eq("referrer_code", code)
            .eq("status", "converted");
          if (!refError && referrals) {
            setReferralCount(referrals.length);
          }
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

  const shareTextEn = `I just joined Mentiva - turn your vision board into an actionable plan with AI. Founding members: $10 forever. ${referralLink}`;
  const shareTextEs = `Me uni a Mentiva - convierte tu vision board en un plan de accion con IA. Miembros fundadores: $10 para siempre. ${referralLink}`;
  const shareText = encodeURIComponent(t(shareTextEn, shareTextEs));
  const shareUrl = encodeURIComponent(referralLink);

  const shareButtons = [
    { label: "WhatsApp", url: `https://wa.me/?text=${shareText}` },
    { label: "X", url: `https://twitter.com/intent/tweet?text=${shareText}` },
    { label: t("Text", "SMS"), url: `sms:?body=${shareText}` },
    { label: "Email", url: `mailto:?subject=Mentiva&body=${shareText}` },
    { label: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
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

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="max-w-xl mx-auto text-center space-y-6 animate-[rise_0.8s_ease-out_both]">
          <h1 className="font-serif font-light text-3xl sm:text-4xl" style={{ color: "rgba(255,255,255,0.95)" }}>
            {t("Welcome, Founding Member.", "Bienvenido/a, Miembro Fundador.")}
          </h1>

          <div className="animate-[scaleIn_0.6s_ease-out_0.3s_both]" style={{ color: "#D4BE8C" }}>
            <span className="font-serif text-6xl sm:text-7xl font-light">#{displayMemberNumber}</span>
          </div>

          <div className="space-y-2">
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {spotsClaimed} {t("of 3,000 spots claimed", "de 3,000 lugares ocupados")}
            </p>
            <div className="h-1 rounded-full bg-white/20 max-w-xs mx-auto overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4BE8C] transition-all duration-500"
                style={{ width: `${Math.min(100, (spotsClaimed / 3000) * 100)}%` }}
              />
            </div>
          </div>

          <p className="font-serif italic font-light" style={{ color: "rgba(255,255,255,0.8)" }}>
            {t(
              "You\u2019re one of the first. Now help us spread the vision.",
              "Eres de los primeros. Ahora ayudanos a compartir la vision."
            )}
          </p>

          {/* Referral link */}
          <div className="space-y-3">
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("Your referral link:", "Tu link de referidos:")}
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
                {copied ? t("Copied!", "Copiado!") : t("Copy Link", "Copiar Link")}
              </button>
            </div>
          </div>

          {/* Share buttons */}
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

          {/* Referral tiers */}
          <div className="pt-4 space-y-3 text-left max-w-sm mx-auto">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="font-sans font-medium text-sm text-white">3 {t("referrals", "referidos")}</p>
              <p className="font-sans text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                {t("Get your $10 back", "Recupera tus $10")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <p className="font-sans font-medium text-sm text-white">5 {t("referrals", "referidos")}</p>
              <p className="font-sans text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                {t("Gift a free lifetime membership", "Regala una membresia gratis")}
              </p>
            </div>
          </div>

          <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            {referralCount > 0
              ? `${referralCount} ${t("referrals so far", "referidos hasta ahora")}`
              : t("Share to start earning rewards", "Comparte para empezar a ganar")}
          </p>

          {/* Continue button */}
          <div className="pt-4">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#4A5C3F] font-sans font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              {t("Continue to Mentiva", "Continuar a Mentiva")} {String.fromCharCode(8594)}
            </a>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center font-sans text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        {String.fromCharCode(169)} 2026 Mentiva
      </footer>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
