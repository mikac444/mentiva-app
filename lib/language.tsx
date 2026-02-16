"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "es";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, es: string) => string;
}>({
  lang: "en",
  setLang: () => {},
  t: (en) => en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mentiva-lang");
    if (saved === "es" || saved === "en") setLangState(saved);
    setLoaded(true);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("mentiva-lang", l);
  }

  function t(en: string, es: string) {
    return lang === "es" ? es : en;
  }

  if (!loaded) return <>{children}</>;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
