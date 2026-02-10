import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-sage-950">
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-6 border-b border-sage-800">
        <Link href="/" className="font-serif text-2xl text-gold-400">
          Mentiva
        </Link>
        <Nav active="upload" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-sage-100">
          Upload vision board
        </h1>
        <p className="mt-1 text-sage-500 text-sm">
          Add images or a photo of your physical board
        </p>

        <div className="mt-8 max-w-2xl">
          <label className="flex flex-col items-center justify-center min-h-[280px] rounded-xl border-2 border-dashed border-sage-700 hover:border-gold-500/50 bg-sage-900/30 cursor-pointer transition-colors">
            <span className="text-4xl text-sage-500 mb-3">↑</span>
            <span className="text-sage-400 font-medium">
              Drop files here or click to upload
            </span>
            <span className="mt-1 text-sage-600 text-sm">
              Images or PDF
            </span>
            <input type="file" className="hidden" accept="image/*,.pdf" />
          </label>
        </div>
      </main>
    </div>
  );
}
