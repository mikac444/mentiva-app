import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 border-b border-sage-800">
        <Link href="/" className="font-serif text-2xl text-gold-400">
          Mentiva
        </Link>
        <Nav active="chat" />
      </header>

      <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-2xl sm:text-3xl text-sage-100">
          AI Chat
        </h1>
        <p className="mt-1 text-sage-500 text-sm">
          Ask about your vision board — themes, goals, next steps
        </p>

        <div className="flex-1 flex flex-col justify-end mt-8 min-h-[320px]">
          <div className="rounded-xl border border-sage-700 bg-sage-900/30 p-4 mb-4 min-h-[120px] flex items-center justify-center text-sage-500 text-sm">
            No messages yet. Ask something about your board.
          </div>
          <form className="flex gap-3" action="#" method="POST">
            <input
              type="text"
              name="message"
              placeholder="e.g. What themes do you see in my board?"
              className="flex-1 rounded-lg border border-sage-700 bg-sage-900/50 px-4 py-3 text-sage-100 placeholder-sage-500 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-gold-500 hover:bg-gold-400 text-sage-950 font-semibold px-5 py-3 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
