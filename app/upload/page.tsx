"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Nav } from "@/components/Nav";
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

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
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
      setAnalysis(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 border-b border-sage-800">
        <Link href="/" className="font-serif text-2xl text-gold-400">
          Mentiva
        </Link>
        <Nav active="upload" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">
        <h1 className="font-serif text-2xl sm:text-3xl text-sage-100">
          Upload vision board
        </h1>
        <p className="mt-1 text-sage-500 text-sm">
          Add an image and we&apos;ll analyze themes, goals, and suggest action steps
        </p>

        {!analysis ? (
          <>
            <div className="mt-8">
              <label className="flex flex-col items-center justify-center min-h-[240px] rounded-xl border-2 border-dashed border-sage-700 hover:border-gold-500/50 bg-sage-900/30 cursor-pointer transition-colors">
                <span className="text-4xl text-sage-500 mb-3">↑</span>
                <span className="text-sage-400 font-medium">
                  Drop an image here or click to upload
                </span>
                <span className="mt-1 text-sage-600 text-sm">
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
                <div className="rounded-xl overflow-hidden border border-sage-700 bg-sage-900/30 shrink-0 max-w-xs">
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
                    className="rounded-lg bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-sage-950 font-semibold px-5 py-3 transition-colors"
                  >
                    {loading ? "Analyzing…" : "Analyze with AI"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="rounded-lg border border-sage-600 text-sage-400 hover:text-gold-400 hover:border-gold-500/50 px-5 py-3 transition-colors"
                  >
                    Choose different image
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 rounded-xl border border-sage-700 bg-sage-900/30 p-6 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-gold-500/50 border-t-gold-400 rounded-full animate-spin" />
                <span className="text-sage-400">Claude is reading your vision board…</span>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-300 text-sm">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 space-y-8">
            {preview && (
              <div className="rounded-xl overflow-hidden border border-sage-700 max-w-sm">
                <img
                  src={preview}
                  alt="Your vision board"
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              <section className="rounded-xl border border-sage-700 bg-sage-900/30 p-5">
                <h2 className="font-serif text-lg text-gold-400 mb-3">Themes</h2>
                <ul className="space-y-2">
                  {analysis.themes.map((t, i) => (
                    <li key={i} className="text-sage-200 flex items-start gap-2">
                      <span className="text-gold-500/80 mt-0.5">✦</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-sage-700 bg-sage-900/30 p-5">
                <h2 className="font-serif text-lg text-gold-400 mb-3">Goals</h2>
                <ul className="space-y-2">
                  {analysis.goals.map((g, i) => (
                    <li key={i} className="text-sage-200 flex items-start gap-2">
                      <span className="text-gold-500/80 mt-0.5">◈</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {analysis.patterns.length > 0 && (
              <section className="rounded-xl border border-sage-700 bg-sage-900/30 p-5">
                <h2 className="font-serif text-lg text-gold-400 mb-3">Patterns</h2>
                <ul className="space-y-2">
                  {analysis.patterns.map((p, i) => (
                    <li key={i} className="text-sage-200 flex items-start gap-2">
                      <span className="text-gold-500/80 mt-0.5">◆</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border border-gold-500/30 bg-sage-900/50 p-6">
              <h2 className="font-serif text-lg text-gold-400 mb-4">Your 5 action steps</h2>
              <ol className="space-y-4">
                {analysis.actionSteps.map(({ step, title, description }) => (
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

            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-sage-600 text-sage-400 hover:text-gold-400 hover:border-gold-500/50 px-5 py-3 transition-colors"
            >
              Analyze another board
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
