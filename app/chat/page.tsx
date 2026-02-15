"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { TopNav } from "@/components/TopNav";
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
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ animationDelay: "0ms", background: "#D4BE8C" }}
      />
      <span
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ animationDelay: "150ms", background: "#D4BE8C" }}
      />
      <span
        className="w-2 h-2 rounded-full animate-bounce"
        style={{ animationDelay: "300ms", background: "#D4BE8C" }}
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

  const headerStyle = { background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
  const glassStyle = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };
  const sidebarStyle = { background: "rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-mentiva-gradient">
      <TopNav />
      <div className="shrink-0 flex items-center justify-between px-4 py-2 lg:hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button type="button" onClick={() => setSidebarOpen((o) => !o)} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.5)" }} aria-label="Conversations">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button type="button" onClick={handleNewChat} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>+ New chat</button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-full sm:w-72 shrink-0 flex flex-col transition-transform duration-200 ease-out pt-4 pb-6`}
          style={{ ...sidebarStyle, top: "64px", bottom: 0 }}
        >
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full rounded-lg font-medium py-2.5 px-3 text-sm transition-colors"
              style={{ background: "#FFFFFF", color: "#4A5C3F" }}
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-1 rounded-lg mb-1 transition-colors"
                style={{ background: currentConversationId === conv.id ? "rgba(255,255,255,0.15)" : "transparent" }}
              >
                <button
                  type="button"
                  onClick={() => handleSelectConversation(conv)}
                  className="flex-1 min-w-0 text-left px-3 py-2.5 text-sm transition-colors"
                  style={{ color: currentConversationId === conv.id ? "white" : "rgba(255,255,255,0.7)" }}
                >
                  <p className="truncate font-medium">{conv.title || "New chat"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{formatConversationDate(conv.updated_at)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(conv);
                  }}
                  className="shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#e57373" }}
                  title="Delete conversation"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-auto px-3 pt-3 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <button
              type="button"
              onClick={async () => {
                setSidebarOpen(false);
                const supabase = createClient();
                await supabase.auth.signOut({ scope: "global" });
                window.location.href = "/login";
              }}
              className="block w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-white/10 hover:text-white"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Sign out
            </button>
          </div>
        </aside>

        {conversationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div className="rounded-xl p-5 shadow-xl max-w-sm w-full" style={glassStyle}>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>Delete this conversation?</p>
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConversationToDelete(null)}
                  disabled={deletingConversation}
                  className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.22)" }}
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
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: "rgba(0,0,0,0.2)" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <main className="flex-1 flex flex-col min-h-0 min-w-0 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pb-4 min-h-0">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
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
                          ? "rounded-br-md"
                          : "rounded-bl-md"
                      }`}
                      style={{
                        background: msg.role === "user" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
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
                    <div
                      className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}
                    >
                      <p className="text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>Menti</p>
                      <BouncingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {error && (
            <div className="shrink-0 rounded-lg px-4 py-2 text-sm mb-3" style={{ background: "rgba(229,115,115,0.2)", border: "1px solid rgba(229,115,115,0.5)", color: "#ffcdd2" }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="shrink-0 flex gap-2 sm:gap-3 items-end pt-4 pb-[env(safe-area-inset-bottom)]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
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
              className="flex-1 min-h-[44px] max-h-32 resize-y rounded-xl px-4 py-3 outline-none disabled:opacity-50 text-sm sm:text-base placeholder-opacity-60"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)", color: "white", backdropFilter: "blur(10px)" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold px-4 sm:px-5 py-3 h-[44px] transition-colors"
              style={{ background: "#FFFFFF", color: "#4A5C3F" }}
            >
              Send
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
