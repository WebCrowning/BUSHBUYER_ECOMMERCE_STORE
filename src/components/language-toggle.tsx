"use client";

import { useLanguage } from "@/context/language-context";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex items-center rounded-full border border-white/25 bg-white/10 p-0.5 text-xs font-bold backdrop-blur-sm"
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-full px-2.5 py-1 transition-all ${
          lang === "en"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        🇬🇧 EN
      </button>
      <button
        type="button"
        onClick={() => setLang("fr")}
        aria-pressed={lang === "fr"}
        className={`rounded-full px-2.5 py-1 transition-all ${
          lang === "fr"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        🇫🇷 FR
      </button>
    </div>
  );
}
