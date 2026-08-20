"use client";

import { useLanguage } from "@/context/language-context";
import { translations, type TranslationKey } from "@/lib/translations";

export function useTranslation() {
  const { lang } = useLanguage();

  function t(key: TranslationKey): string {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }

  return { t, lang };
}
