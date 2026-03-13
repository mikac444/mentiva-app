"use client";
import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/language";
import { BottomNav } from "@/components/BottomNav";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <BottomNav />
    </LanguageProvider>
  );
}

