"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/analyze-types";

type VisionBoardRow = {
  id: string;
  user_id: string;
  image_url: string;
  analysis: AnalysisResult;
  created_at: string;
};

export default function DashboardPage() {
  const [boards, setBoards] = useState<VisionBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<VisionBoardRow | null>(null);

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
        .select("id, user_id, image_url, analysis, created_at")
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

  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 border-b border-sage-800">
        <Link href="/" className="font-serif text-2xl text-gold-400">
          Mentiva
        </Link>
        <Nav active="dashboard" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-sage-100">
          Your boards
        </h1>
        <p className="mt-1 text-sage-500 text-sm">
          Create and manage your vision boards
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link
            href="/upload"
            className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed border-sage-700 hover:border-gold-500/50 text-sage-500 hover:text-gold-400 transition-colors"
          >
            <span className="text-3xl mb-2">+</span>
            <span className="font-medium">New vision board</span>
          </Link>
          {loading ? (
            <div className="col-span-full sm:col-span-1 flex items-center justify-center min-h-[200px] text-sage-500 text-sm">
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
                <div className="aspect-video bg-sage-800 relative">
                  {board.image_url ? (
                    <img
                      src={board.image_url}
                      alt="Vision board"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sage-600 text-2xl">
                      ✦
                    </div>
                  )}
                </div>
                <p className="p-3 text-sage-500 text-sm">
                  {formatDate(board.created_at)}
                </p>
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
            className="bg-sage-900 border border-sage-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-sage-700 bg-sage-900">
              <span className="text-sage-400 text-sm">
                {formatDate(selectedBoard.created_at)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedBoard(null)}
                className="text-sage-500 hover:text-gold-400"
              >
                Close
              </button>
            </div>
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
                <>
                  <section className="rounded-xl border border-sage-700 bg-sage-800/50 p-5">
                    <h2 className="font-serif text-lg text-gold-400 mb-3">Themes</h2>
                    <ul className="space-y-2">
                      {selectedBoard.analysis.themes?.map((t, i) => (
                        <li key={i} className="text-sage-200 flex items-start gap-2">
                          <span className="text-gold-500/80 mt-0.5">✦</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl border border-sage-700 bg-sage-800/50 p-5">
                    <h2 className="font-serif text-lg text-gold-400 mb-3">Goals</h2>
                    <ul className="space-y-2">
                      {selectedBoard.analysis.goals?.map((g, i) => (
                        <li key={i} className="text-sage-200 flex items-start gap-2">
                          <span className="text-gold-500/80 mt-0.5">◈</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  {selectedBoard.analysis.patterns?.length > 0 && (
                    <section className="rounded-xl border border-sage-700 bg-sage-800/50 p-5">
                      <h2 className="font-serif text-lg text-gold-400 mb-3">Patterns</h2>
                      <ul className="space-y-2">
                        {selectedBoard.analysis.patterns.map((p, i) => (
                          <li key={i} className="text-sage-200 flex items-start gap-2">
                            <span className="text-gold-500/80 mt-0.5">◆</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {selectedBoard.analysis.actionSteps?.length > 0 && (
                    <section className="rounded-xl border border-gold-500/30 bg-sage-800/50 p-5">
                      <h2 className="font-serif text-lg text-gold-400 mb-4">Your 5 action steps</h2>
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
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
