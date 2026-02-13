"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/analyze-types";

const WELCOME_MESSAGE =
  "Hey! I'm Menti, your AI mentor. I'm here to help you turn your vision board dreams into reality. What are you working on today?";

type Message = { role: "user" | "assistant"; content: string };

type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

function formatConversationDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  } catch {
    return iso;
  }
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BouncingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-hidden>
      <span
        className="w-2 h-2 rounded-full bg-gold-400 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gold-400/90 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gold-400 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visionBoard, setVisionBoard] = useState<AnalysisResult | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversations = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, user_id, title, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });
    setConversations((data as Conversation[]) ?? []);
  }, []);

  const currentConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (currentConversationIdRef.current !== conversationId) return;
    if (data?.length) {
      setMessages(data as Message[]);
    } else {
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
        setLoadingHistory(false);
        return;
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
      const { data: convRows } = await supabase
        .from("chat_conversations")
        .select("id, user_id, title, created_at, updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });
      const convs = (convRows as Conversation[]) ?? [];
      setConversations(convs);
      if (convs.length === 0) {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({ user_id: session.user.id, title: "New chat" })
          .select("id")
          .single();
        if (newConv?.id) {
          setCurrentConversationId(newConv.id);
          setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
          setConversations((prev) => [{ id: newConv.id, user_id: session.user.id!, title: "New chat", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
        }
      } else {
        setCurrentConversationId(convs[0].id);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", convs[0].id)
          .order("created_at", { ascending: true });
        if (msgs?.length) {
          setMessages(msgs as Message[]);
        } else {
          setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
        }
      }
      setLoadingHistory(false);
    })();
  }, [loadMessages]);

  useEffect(() => {
    if (!currentConversationId) return;
    loadMessages(currentConversationId);
  }, [currentConversationId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleNewChat() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("chat_conversations")
      .insert({ user_id: session.user.id, title: "New chat" })
      .select("id, user_id, title, created_at, updated_at")
      .single();
    if (data) {
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
      setConversations((prev) => [data as Conversation, ...prev]);
      setError(null);
      setSidebarOpen(false);
    }
  }

  async function handleSelectConversation(conv: Conversation) {
    setCurrentConversationId(conv.id);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
  }

  async function handleDeleteConversation() {
    if (!conversationToDelete) return;
    setDeletingConversation(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setDeletingConversation(false);
      setConversationToDelete(null);
      return;
    }
    const id = conversationToDelete.id;
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("chat_conversations").delete().eq("id", id).eq("user_id", session.user.id);
    const nextConvs = conversations.filter((c) => c.id !== id);
    setConversations(nextConvs);
    setConversationToDelete(null);
    setDeletingConversation(false);

    if (currentConversationId === id) {
      if (nextConvs.length === 0) {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({ user_id: session.user.id, title: "New chat" })
          .select("id, user_id, title, created_at, updated_at")
          .single();
        if (newConv) {
          const newConversation = newConv as Conversation;
          setCurrentConversationId(newConversation.id);
          setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
          setConversations([newConversation]);
        } else {
          setCurrentConversationId(null);
          setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
        }
      } else {
        setCurrentConversationId(nextConvs[0].id);
      }
    }
  }

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
    if (!session?.user?.id) {
      setError("Sign in to chat.");
      setIsLoading(false);
      return;
    }

    let convId = currentConversationId;
    const isFirstMessage = messages.length <= 1 && (messages.length === 0 || messages[0].role === "assistant");

    if (!convId) {
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ user_id: session.user.id, title: "New chat" })
        .select("id")
        .single();
      if (!newConv?.id) {
        setError("Could not create conversation.");
        setIsLoading(false);
        return;
      }
      convId = newConv.id;
      setCurrentConversationId(convId);
      setConversations((prev) => [{ id: convId!, user_id: session.user.id!, title: "New chat", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    }

    const title = text.length > 30 ? text.slice(0, 30) + "…" : text;
    if (isFirstMessage) {
      await supabase
        .from("chat_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", convId);
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, title, updated_at: new Date().toISOString() } : c));
    }

    await supabase.from("chat_messages").insert({
      conversation_id: convId,
      user_id: session.user.id,
      role: "user",
      content: text,
    });

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

      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        user_id: session.user.id,
        role: "assistant",
        content: reply,
      });

      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-sage-950">
      <header className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-sage-800">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden shrink-0 p-3 -ml-2 rounded-lg text-sage-400 hover:text-gold-400 hover:bg-sage-800/60 transition-colors touch-manipulation"
            aria-label="Conversations"
            aria-expanded={sidebarOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Nav active="chat" hideHamburger />
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="lg:hidden shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 font-medium transition-colors touch-manipulation"
          aria-label="New chat"
        >
          <span className="text-xl leading-none">+</span>
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-full sm:w-72 shrink-0 flex flex-col border-r border-sage-800 bg-sage-950 transition-transform duration-200 ease-out pt-4 pb-6`}
          style={{ top: "64px", bottom: 0 }}
        >
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 font-medium py-2.5 px-3 text-sm transition-colors"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-1 rounded-lg mb-1 ${
                  currentConversationId === conv.id ? "bg-sage-800" : "hover:bg-sage-800/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectConversation(conv)}
                  className={`flex-1 min-w-0 text-left px-3 py-2.5 text-sm transition-colors ${
                    currentConversationId === conv.id ? "text-gold-400" : "text-sage-400 hover:text-sage-200"
                  }`}
                >
                  <p className="truncate font-medium">{conv.title || "New chat"}</p>
                  <p className="text-xs text-sage-500 mt-0.5">{formatConversationDate(conv.updated_at)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(conv);
                  }}
                  className="shrink-0 p-1.5 rounded text-sage-500 hover:text-red-400 hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete conversation"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-sage-800 px-3 pt-3 pb-4 space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="block px-3 py-2.5 text-sm text-sage-400 hover:text-gold-400 hover:bg-sage-800/60 rounded-lg transition-colors"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/upload"
              onClick={() => setSidebarOpen(false)}
              className="block px-3 py-2.5 text-sm text-sage-400 hover:text-gold-400 hover:bg-sage-800/60 rounded-lg transition-colors"
            >
              📤 Upload
            </Link>
            <a
              href="mailto:mika@mentiva.app"
              onClick={() => setSidebarOpen(false)}
              className="block px-3 py-2.5 text-sm text-sage-400 hover:text-gold-400 hover:bg-sage-800/60 rounded-lg transition-colors"
            >
              💬 Send feedback
            </a>
            <button
              type="button"
              onClick={async () => {
                setSidebarOpen(false);
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="block w-full text-left px-3 py-2.5 text-sm text-sage-400 hover:text-gold-400 hover:bg-sage-800/60 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {conversationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-950/80">
            <div className="bg-sage-900 border border-sage-700 rounded-xl p-5 shadow-xl max-w-sm w-full">
              <p className="text-sage-200 text-sm">Delete this conversation?</p>
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConversationToDelete(null)}
                  disabled={deletingConversation}
                  className="px-4 py-2 rounded-lg border border-sage-600 text-sage-400 hover:text-gold-400 hover:border-gold-500/50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  disabled={deletingConversation}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {deletingConversation ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-sage-950/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pb-4 min-h-0">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-sage-500 text-sm">
                Loading…
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
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-sage-800/80 text-sage-200 border border-sage-700 shadow-sm">
                      <p className="text-sm font-medium text-sage-500 mb-2">Menti</p>
                      <BouncingDots />
                    </div>
                  </div>
                )}
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
            className="shrink-0 flex gap-2 sm:gap-3 items-end border-t border-sage-800 pt-4 pb-[env(safe-area-inset-bottom)] bg-sage-950"
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
    </div>
  );
}
