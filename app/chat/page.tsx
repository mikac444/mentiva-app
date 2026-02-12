"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/analyze-types";

const WELCOME_MESSAGE =
  "Hey! I'm Menti, your AI mentor. I'm here to help you turn your vision board dreams into reality. What are you working on today?";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visionBoard, setVisionBoard] = useState<AnalysisResult | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
        setLoadingHistory(false);
        return;
      }
      const { data: chatRows } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (chatRows?.length) {
        setMessages(chatRows as Message[]);
      } else {
        setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
      }
      const { data: boardRows } = await supabase
        .from("vision_boards")
        .select("analysis")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (boardRows?.[0]?.analysis) {
        setVisionBoard(boardRows[0].analysis as AnalysisResult);
      }
      setLoadingHistory(false);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput("");
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.from("chat_messages").insert({
        user_id: session.user.id,
        role: "user",
        content: text,
      });
    }

    try {
      const history = [...messages, userMessage];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          visionBoard: visionBoard ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      const reply = typeof data.reply === "string" ? data.reply : "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (session?.user?.id) {
        await supabase.from("chat_messages").insert({
          user_id: session.user.id,
          role: "assistant",
          content: reply,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-sage-800">
        <Link href="/" className="font-serif text-xl sm:text-2xl text-gold-400">
          Mentiva
        </Link>
        <Nav active="chat" />
      </header>

      <main className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pb-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12 text-sage-500 text-sm">
              Loading conversation…
            </div>
          ) : (
          <>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gold-500/20 text-sage-100 rounded-br-md"
                    : "bg-sage-800/80 text-sage-200 border border-sage-700 rounded-bl-md"
                }`}
              >
                <p className="text-sm font-medium text-sage-500 mb-1">
                  {msg.role === "user" ? "You" : "Menti"}
                </p>
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
          </>
          )}
        </div>

        {error && (
          <div className="shrink-0 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-2 text-red-300 text-sm mb-3">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex gap-2 sm:gap-3 items-end border-t border-sage-800 pt-4"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Message Menti…"
            rows={1}
            disabled={isLoading}
            className="flex-1 min-h-[44px] max-h-32 resize-y rounded-xl border border-sage-700 bg-sage-900/50 px-4 py-3 text-sage-100 placeholder-sage-500 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 outline-none disabled:opacity-50 text-sm sm:text-base"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-sage-950 font-semibold px-4 sm:px-5 py-3 h-[44px] transition-colors"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
