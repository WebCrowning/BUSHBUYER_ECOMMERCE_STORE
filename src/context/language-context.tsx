"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Lang = "en" | "fr";

interface LanguageContextValue {
  lang: Lang;
  toggleLanguage: () => void;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  toggleLanguage: () => {},
  setLang: () => {},
});

const STORAGE_KEY = "bushbuyer_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage once on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "fr" || stored === "en") {
        setLangState(stored);
      }
    } catch {
      // localStorage not available (e.g. SSR / private mode)
    }
  }, []);

  // Sync html lang attribute whenever language changes
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }

  function toggleLanguage() {
    setLang(lang === "en" ? "fr" : "en");
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
