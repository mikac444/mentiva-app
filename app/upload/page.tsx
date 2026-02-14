"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Nav } from "@/components/Nav";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { createClient } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/analyze-types";

const MAX_LONGEST_SIDE = 1024;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      const scale = MAX_LONGEST_SIDE / Math.max(w, h);
      const width = Math.round(w * scale);
      const height = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

const glassStyle = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
const headerStyle = { background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
const inputStyle = { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", color: "white", backdropFilter: "blur(10px)" };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [savedBase64, setSavedBase64] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    setError(null);
    setAnalysis(null);
    if (!chosen) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!chosen.type.startsWith("image/")) {
      setError("Please choose an image file (JPEG, PNG, GIF, or WebP).");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(chosen);
    const url = URL.createObjectURL(chosen);
    setPreview(url);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = await compressImage(file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mediaType: "image/jpeg",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const analysisResult = data as AnalysisResult;
      setAnalysis(analysisResult);
      setSavedBase64(base64);
      setBoardTitle("");
      setSaveSuccess(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBoard() {
    if (!savedBase64 || !analysis) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("Sign in to save your board.");
        setSaving(false);
        return;
      }
      await supabase.from("vision_boards").insert({
        user_id: session.user.id,
        image_url: savedBase64,
        analysis,
        title: boardTitle.trim() || "Untitled board",
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setSavedBase64(null);
    setBoardTitle("");
    setSaveSuccess(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="min-h-screen flex flex-col bg-mentiva-gradient">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6" style={headerStyle}>
        <Nav active="upload" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">
        <h1 className="font-serif font-light text-2xl sm:text-3xl" style={{ color: "rgba(255,255,255,0.9)" }}>
          Upload vision board
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          Add an image and we&apos;ll analyze themes, goals, and suggest action steps
        </p>

        {!analysis ? (
          <>
            <div className="mt-8">
              <label
                className="flex flex-col items-center justify-center min-h-[240px] rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.05)" }}
              >
                <span className="text-4xl mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>↑</span>
                <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Drop an image here or click to upload
                </span>
                <span className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  JPEG, PNG, GIF, or WebP
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
            </div>

            {preview && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="rounded-xl overflow-hidden shrink-0 max-w-xs" style={glassStyle}>
                  <img
                    src={preview}
                    alt="Vision board preview"
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="rounded-lg font-semibold px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "#FFFFFF", color: "#4A5C3F" }}
                  >
                    {loading ? "Menti is reading…" : "Analyze with Menti"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="rounded-lg px-5 py-3 transition-colors"
                    style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.22)" }}
                  >
                    Choose different image
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 rounded-xl p-6 flex items-center gap-3" style={glassStyle}>
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#D4BE8C" }} />
                <span style={{ color: "rgba(255,255,255,0.8)" }}>Menti is reading your vision board…</span>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl p-4 text-sm" style={{ background: "rgba(229,115,115,0.2)", border: "1px solid rgba(229,115,115,0.5)", color: "#ffcdd2" }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 space-y-8">
            {preview && (
              <div className="rounded-xl overflow-hidden max-w-sm" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                <img
                  src={preview}
                  alt="Your vision board"
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <CollapsibleSection title="Themes" defaultOpen>
                <ul className="space-y-2">
                  {analysis.themes.map((t, i) => (
                    <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                      <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>

              <CollapsibleSection title="Goals" defaultOpen={false}>
                <ul className="space-y-2">
                  {analysis.goals.map((g, i) => (
                    <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                      <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>

              {analysis.patterns.length > 0 && (
                <CollapsibleSection title="Patterns" defaultOpen={false}>
                  <ul className="space-y-2">
                    {analysis.patterns.map((p, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                        <span className="mt-0.5" style={{ color: "#D4BE8C" }}>-</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}

              <CollapsibleSection title="Your 5 action steps" defaultOpen={false}>
                <ol className="space-y-4">
                  {analysis.actionSteps.map(({ step, title, description }) => (
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
            </div>

            <section className="rounded-xl p-5" style={glassStyle}>
              <h2 className="font-serif text-lg mb-3" style={{ color: "#D4BE8C" }}>Give this board a name</h2>
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                placeholder="e.g. My 2026 Goals"
                className="w-full rounded-lg px-4 py-3 outline-none placeholder-white/60"
                style={{ ...inputStyle, color: "white" }}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveBoard}
                  disabled={saving}
                  className="rounded-lg font-semibold px-5 py-3 transition-colors disabled:opacity-50"
                  style={{ background: "#FFFFFF", color: "#4A5C3F" }}
                >
                  {saving ? "Saving…" : "Save to my boards"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-lg px-5 py-3 transition-colors"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.22)" }}
                >
                  Analyze another board
                </button>
              </div>
              {saveSuccess && (
                <p className="mt-3 text-sm" style={{ color: "#D4BE8C" }}>Board saved. View it on your dashboard.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
