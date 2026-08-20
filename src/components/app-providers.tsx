"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/cart-context";
import { LanguageProvider } from "@/context/language-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <CartProvider>{children}</CartProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
