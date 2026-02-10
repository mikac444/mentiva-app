import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      {/* Subtle background texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e0ab48' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/" className="font-serif text-2xl sm:text-3xl text-gold-400">
          Mentiva
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sage-300 hover:text-gold-400 transition-colors text-sm sm:text-base"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-gold-500/90 hover:bg-gold-400 text-sage-950 font-semibold px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base transition-colors"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium text-sage-100 leading-tight tracking-tight">
            Your vision board,
            <br />
            <span className="text-gold-400">with a brain</span>
          </h1>
          <p className="mt-6 sm:mt-8 text-sage-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Create beautiful vision boards and let AI help you clarify goals,
            uncover patterns, and turn inspiration into action.
          </p>
          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto rounded-full bg-gold-500 hover:bg-gold-400 text-sage-950 font-semibold px-8 py-4 text-base transition-colors"
            >
              Start your board
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-full border border-sage-600 hover:border-gold-500/50 text-sage-200 hover:text-gold-400 font-medium px-8 py-4 text-base transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature hints */}
        <div className="mt-20 sm:mt-28 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl w-full">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-sage-800/80 border border-sage-700 flex items-center justify-center mx-auto text-gold-400 text-xl">
              ✦
            </div>
            <h3 className="mt-4 font-serif text-lg text-sage-200">Upload</h3>
            <p className="mt-1 text-sage-500 text-sm">
              Add images and ideas to your board
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-sage-800/80 border border-sage-700 flex items-center justify-center mx-auto text-gold-400 text-xl">
              ◈
            </div>
            <h3 className="mt-4 font-serif text-lg text-sage-200">Reflect</h3>
            <p className="mt-1 text-sage-500 text-sm">
              AI helps you see themes and goals
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-sage-800/80 border border-sage-700 flex items-center justify-center mx-auto text-gold-400 text-xl">
              ◆
            </div>
            <h3 className="mt-4 font-serif text-lg text-sage-200">Act</h3>
            <p className="mt-1 text-sage-500 text-sm">
              Turn your vision into next steps
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 px-4 text-center text-sage-600 text-sm">
        © {new Date().getFullYear()} Mentiva
      </footer>
    </div>
  );
}
