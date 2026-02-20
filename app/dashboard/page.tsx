"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import type { AnalysisResult } from "@/lib/analyze-types";
import { OnboardingChat } from "@/components/OnboardingChat";
import { TopNav } from "@/components/TopNav";

type VisionBoardRow = {
  id: string;
  user_id: string;
  image_url: string;
  analysis: AnalysisResult;
  title: string | null;
  created_at: string;
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

const glassStyle = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
const headerStyle = { background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };

export default function DashboardPage() {
  const { t } = useLanguage();
  const [boards, setBoards] = useState<VisionBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<VisionBoardRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState("");
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      const { data } = await supabase
        .from("vision_boards")
        .select("id, user_id, image_url, analysis, title, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setBoards((data as VisionBoardRow[]) ?? []);
      // Onboarding check
      const name = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "friend";
      setUserName(name.split(/\s+/)[0]);
      if (!localStorage.getItem("mentiva_onboarding_done")) {
        // Get member number
        try {
          const { data: members } = await supabase
            .from("allowed_emails")
            .select("email")
            .order("created_at", { ascending: true });
          if (members) {
            const pos = members.findIndex((m: any) => m.email === session.user.email?.toLowerCase());
            setMemberNumber(pos >= 0 ? pos + 1 : members.length);
          }
        } catch (e) {}
        setShowOnboarding(true);
      }
      setLoading(false);
    })();
  }, []);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  async function handleDeleteBoard() {
    if (!selectedBoard) return;
    setDeleting(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setDeleting(false);
      return;
    }
    await supabase
      .from("vision_boards")
      .delete()
      .eq("id", selectedBoard.id)
      .eq("user_id", session.user.id);
    setBoards((prev) => prev.filter((b) => b.id !== selectedBoard.id));
    setSelectedBoard(null);
    setShowDeleteConfirm(false);
    setDeleting(false);
  }


  if (showOnboarding) {
    return <OnboardingChat firstName={userName} userId={userId} memberNumber={memberNumber} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-mentiva-gradient">
      <TopNav />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-serif font-light text-2xl sm:text-3xl" style={{ color: "rgba(255,255,255,0.9)" }}>
          {t("Your boards", "Tus tableros")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("Create and manage your vision boards", "Crea y administra tus tableros de visión")}
        </p>

        <div className="mt-8 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          <Link
            href="/upload"
            className="flex flex-col rounded-xl border-2 border-dashed overflow-hidden transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.6)" }}
          >
            <div className="w-full aspect-square max-h-[150px] flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl mb-1">+</span>
              <span className="font-medium text-sm text-center px-2">{t("Upload New Board", "Subir Nuevo Tablero")}</span>
            </div>
          </Link>
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              Loading…
            </div>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoard(board)}
                className="flex flex-col rounded-xl overflow-hidden text-left transition-colors"
                style={glassStyle}
              >
                <div className="w-full aspect-square max-h-[150px] relative shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {board.image_url ? (
                    <img
                      src={board.image_url}
                      alt={board.title || "Vision board"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: "rgba(255,255,255,0.3)" }}>
                      +
                    </div>
                  )}
                </div>
                <div className="p-2 min-h-0 flex flex-col justify-center">
                  <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }} title={board.title || "Untitled"}>
                    {board.title || "Untitled board"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {formatDate(board.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      {selectedBoard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setSelectedBoard(null)}
        >
          <div
            className="relative rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            style={glassStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between gap-4 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="min-w-0">
                <p className="font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {selectedBoard.title || "Untitled board"}
                </p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {formatDate(selectedBoard.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#e57373" }}
                  title="Delete board"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBoard(null)}
                  className="transition-colors"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Close
                </button>
              </div>
            </div>
            {showDeleteConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
                <div className="rounded-xl p-5 max-w-sm w-full shadow-xl" style={glassStyle}>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>
                    Are you sure you want to delete this board?
                  </p>
                  <div className="mt-4 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.22)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteBoard}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 sm:p-6 space-y-6">
              {selectedBoard.image_url && (
                <div className="rounded-xl overflow-hidden max-w-sm" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  <img
                    src={selectedBoard.image_url}
                    alt="Vision board"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              {selectedBoard.analysis && (
                <div className="space-y-4">
                  <CollapsibleSection title="Themes" defaultOpen>
                    <ul className="space-y-2">
                      {selectedBoard.analysis.themes?.map((t, i) => (
                        <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                          <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                  <CollapsibleSection title="Goals" defaultOpen={false}>
                    <ul className="space-y-2">
                      {selectedBoard.analysis.goals?.map((g, i) => (
                        <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                          <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                  {selectedBoard.analysis.patterns?.length > 0 && (
                    <CollapsibleSection title="Patterns" defaultOpen={false}>
                      <ul className="space-y-2">
                        {selectedBoard.analysis.patterns.map((p, i) => (
                          <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                            <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleSection>
                  )}
                  {selectedBoard.analysis.actionSteps?.length > 0 && (
                    <CollapsibleSection title="Your 5 action steps" defaultOpen={false}>
                      <ol className="space-y-4">
                        {selectedBoard.analysis.actionSteps.map(({ step, title, description }) => (
                          <li key={step} className="flex gap-4">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif font-medium text-sm"
                              style={{ background: "rgba(212,190,140,0.3)", color: "#D4BE8C" }}
                            >
                              {step}
                            </span>
                            <div>
                              <p className="font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>{title}</p>
                              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{description}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </CollapsibleSection>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
