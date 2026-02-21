"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type Member = { id: string; email: string; created_at: string };

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newEmails, setNewEmails] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === "mika@mentiva.app") {
      setAuthorized(true);
      fetchMembers();
    } else {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setError("");
    setSuccess("");
    const emails = newEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      setError("Enter at least one email");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add");
      }
      setSuccess(`Added ${emails.length} email(s)`);
      setNewEmails("");
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      fetchMembers();
    } catch {
      setError("Failed to remove member");
    }
  }

  if (!authorized && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f1c", color: "rgba(255,255,255,0.5)" }}>
        <p className="font-sans">Not authorized</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f1c" }}>
        <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "#1a1f1c", color: "rgba(255,255,255,0.9)" }}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-light" style={{ color: "rgba(255,255,255,0.9)" }}>
            Founding Members
          </h1>
          <p className="font-sans text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            {members.length} of 30 spots claimed
          </p>
        </div>

        {/* Add members */}
        <div className="space-y-3">
          <label className="block font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Add emails (one per line, or comma-separated)
          </label>
          <textarea
            value={newEmails}
            onChange={(e) => setNewEmails(e.target.value)}
            placeholder={"friend@example.com\nanother@example.com"}
            rows={3}
            className="w-full px-4 py-3 rounded-lg font-sans text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmails.trim()}
            className="px-5 py-2.5 rounded-lg font-sans text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "rgba(156,175,136,0.3)",
              border: "1px solid rgba(156,175,136,0.5)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {adding ? "Adding..." : "Add Members"}
          </button>
          {error && <p className="font-sans text-sm" style={{ color: "#e57373" }}>{error}</p>}
          {success && <p className="font-sans text-sm" style={{ color: "#81c784" }}>{success}</p>}
        </div>

        {/* Member list */}
        <div className="space-y-1">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div>
                <span className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {m.email}
                </span>
                <span className="font-sans text-xs ml-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => handleRemove(m.email)}
                className="font-sans text-xs px-2 py-1 rounded transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                remove
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="font-sans text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              No members yet
            </p>
          )}
        </div>

        <div className="pt-4">
          <a href="/dashboard" className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
