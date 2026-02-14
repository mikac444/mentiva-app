"use client";

import { useState } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  borderClassName?: string;
};

const glassStyle = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(10px)",
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  borderClassName = "",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`rounded-xl overflow-hidden ${className}`}
      style={glassStyle}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left transition-colors cursor-pointer hover:bg-white/5 rounded-t-xl"
        style={{ color: "rgba(255,255,255,0.9)" }}
      >
        <h2 className="font-serif text-lg" style={{ color: "#D4BE8C" }}>{title}</h2>
        <span className="shrink-0 text-sm" style={{ color: "rgba(255,255,255,0.7)" }} aria-hidden>
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
