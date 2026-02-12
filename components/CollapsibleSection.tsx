"use client";

import { useState } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  borderClassName?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  borderClassName = "border-sage-700",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`rounded-xl border bg-sage-900/30 overflow-hidden ${borderClassName} ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-sage-800/30 transition-colors cursor-pointer"
      >
        <h2 className="font-serif text-lg text-gold-400">{title}</h2>
        <span className="shrink-0 text-gold-400/80 text-sm" aria-hidden>
          {isOpen ? "▼" : "▶"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? 2000 : 0 }}
      >
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5 sm:pt-0">
          {children}
        </div>
      </div>
    </section>
  );
}
