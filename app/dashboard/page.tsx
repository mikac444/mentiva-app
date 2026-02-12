"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Nav } from "@/components/Nav";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { createClient } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/analyze-types";

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

export default function DashboardPage() {
  const [boards, setBoards] = useState<VisionBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<VisionBoardRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("vision_boards")
        .select("id, user_id, image_url, analysis, title, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setBoards((data as VisionBoardRow[]) ?? []);
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

  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 border-b border-sage-800">
        <Nav active="dashboard" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-sage-100">
          Your boards
        </h1>
        <p className="mt-1 text-sage-500 text-sm">
          Create and manage your vision boards
        </p>

        <div className="mt-8 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          <Link
            href="/upload"
            className="flex flex-col rounded-xl border-2 border-dashed border-sage-700 hover:border-gold-500/50 text-sage-500 hover:text-gold-400 transition-colors overflow-hidden"
          >
            <div className="w-full aspect-square max-h-[150px] flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl mb-1">+</span>
              <span className="font-medium text-sm text-center px-2">New vision board</span>
            </div>
          </Link>
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12 text-sage-500 text-sm">
              Loading…
            </div>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoard(board)}
                className="flex flex-col rounded-xl border border-sage-700 bg-sage-900/30 overflow-hidden hover:border-gold-500/50 transition-colors text-left"
              >
                <div className="w-full aspect-square max-h-[150px] bg-sage-800 relative shrink-0">
                  {board.image_url ? (
                    <img
                      src={board.image_url}
                      alt={board.title || "Vision board"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sage-600 text-2xl">
                      ✦
                    </div>
                  )}
                </div>
                <div className="p-2 min-h-0 flex flex-col justify-center">
                  <p className="text-sage-200 text-sm font-medium truncate" title={board.title || "Untitled"}>
                    {board.title || "Untitled board"}
                  </p>
                  <p className="text-sage-500 text-xs mt-0.5">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-950/90"
          onClick={() => setSelectedBoard(null)}
        >
          <div
            className="relative bg-sage-900 border border-sage-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between gap-4 p-4 border-b border-sage-700 bg-sage-900">
              <div className="min-w-0">
                <p className="text-sage-200 font-medium truncate">
                  {selectedBoard.title || "Untitled board"}
                </p>
                <p className="text-sage-500 text-sm">
                  {formatDate(selectedBoard.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
                  title="Delete board"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBoard(null)}
                  className="text-sage-500 hover:text-gold-400"
                >
                  Close
                </button>
              </div>
            </div>
            {showDeleteConfirm && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-sage-950/80 p-4">
                <div className="bg-sage-900 border border-sage-700 rounded-xl p-5 shadow-xl max-w-sm w-full">
                  <p className="text-sage-200 text-sm">
                    Are you sure you want to delete this board?
                  </p>
                  <div className="mt-4 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg border border-sage-600 text-sage-400 hover:text-gold-400 hover:border-gold-500/50 transition-colors disabled:opacity-50"
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
                <div className="rounded-xl overflow-hidden border border-sage-700 max-w-sm">
                  <img
                    src={selectedBoard.image_url}
                    alt="Vision board"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
              {selectedBoard.analysis && (
                <div className="space-y-4">
                  <CollapsibleSection
                    title="Themes"
                    defaultOpen
                    className="bg-sage-800/50"
                  >
                    <ul className="space-y-2">
                      {selectedBoard.analysis.themes?.map((t, i) => (
                        <li key={i} className="text-sage-200 flex items-start gap-2">
                          <span className="text-gold-500/80 mt-0.5">✦</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Goals"
                    defaultOpen={false}
                    className="bg-sage-800/50"
                  >
                    <ul className="space-y-2">
                      {selectedBoard.analysis.goals?.map((g, i) => (
                        <li key={i} className="text-sage-200 flex items-start gap-2">
                          <span className="text-gold-500/80 mt-0.5">◈</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                  {selectedBoard.analysis.patterns?.length > 0 && (
                    <CollapsibleSection
                      title="Patterns"
                      defaultOpen={false}
                      className="bg-sage-800/50"
                    >
                      <ul className="space-y-2">
                        {selectedBoard.analysis.patterns.map((p, i) => (
                          <li key={i} className="text-sage-200 flex items-start gap-2">
                            <span className="text-gold-500/80 mt-0.5">◆</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleSection>
                  )}
                  {selectedBoard.analysis.actionSteps?.length > 0 && (
                    <CollapsibleSection
                      title="Your 5 action steps"
                      defaultOpen={false}
                      borderClassName="border-gold-500/30"
                      className="bg-sage-800/50"
                    >
                      <ol className="space-y-4">
                        {selectedBoard.analysis.actionSteps.map(({ step, title, description }) => (
                          <li key={step} className="flex gap-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 font-serif font-medium text-sm">
                              {step}
                            </span>
                            <div>
                              <p className="font-medium text-sage-100">{title}</p>
                              <p className="text-sage-400 text-sm mt-0.5">{description}</p>
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
