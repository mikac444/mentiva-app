import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function DashboardPage() {
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
          {/* Placeholder for future boards */}
        </div>
      </main>
    </div>
  );
}
