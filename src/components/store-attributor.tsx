"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * StoreAttributor — rendered on /store/[slug] and product pages to capture store referral links.
 *
 * Does two things:
 * 1. Sets the ref_store_id and ref_store_slug cookies (30-day, SameSite=Lax) and localStorage
 *    so auth.ts picks it up at sign-in / sign-up time for new or returning users.
 * 2. For users who are ALREADY authenticated when visiting the store page,
 *    calls POST /api/user/referral to persist attribution to DB immediately (first-attribution-wins).
 */
export function StoreAttributor({ storeId, storeSlug }: { storeId: number; storeSlug?: string }) {
  const { data: session, status } = useSession();

  // ── Step 1: Write referral cookies + localStorage ──
  useEffect(() => {
    if (!storeId) return;

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `ref_store_id=${storeId}; expires=${expires}; path=/; SameSite=Lax`;
    if (storeSlug) {
      document.cookie = `ref_store_slug=${storeSlug}; expires=${expires}; path=/; SameSite=Lax`;
    }

    try {
      localStorage.setItem("ref_store_id", String(storeId));
      if (storeSlug) {
        localStorage.setItem("ref_store_slug", storeSlug);
      }
    } catch {
      // localStorage may be blocked in private/incognito
    }
  }, [storeId, storeSlug]);

  // ── Step 2: For authenticated users without attribution, persist to DB ──
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const user = session.user as {
      referredByStoreId?: number | null;
    };

    if (user.referredByStoreId === storeId || user.referredByStoreId) return;

    void fetch("/api/user/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, storeSlug }),
    }).catch(() => {
      // Fire-and-forget
    });
  }, [status, session, storeId, storeSlug]);

  return null;
}
