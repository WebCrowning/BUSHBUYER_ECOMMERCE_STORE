"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * StoreAttributor — rendered on every /store/[slug] page.
 *
 * Does two things:
 *
 * 1. Sets the ref_store_id cookie (30-day, SameSite=Lax) and localStorage so
 *    that auth.ts can pick it up at sign-in time for new / logged-out users.
 *
 * 2. For users who are ALREADY authenticated when they visit the store page
 *    (i.e. the cookie was never present during their sign-in), calls
 *    POST /api/user/referral so the attribution is saved to the DB immediately
 *    — first-attribution-wins is enforced server-side.
 */
export function StoreAttributor({ storeId }: { storeId: number }) {
  const { data: session, status } = useSession();

  // ── Step 1: Write the referral cookie + localStorage (always, for any visitor) ──
  useEffect(() => {
    if (!storeId) return;

    // 30-day cookie accessible across the whole site
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `ref_store_id=${storeId}; expires=${expires}; path=/; SameSite=Lax`;

    try {
      localStorage.setItem("ref_store_id", String(storeId));
    } catch {
      // localStorage may be blocked in private/incognito
    }
  }, [storeId]);

  // ── Step 2: For authenticated users, persist attribution via API ──────────
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const user = session.user as {
      referredByStoreId?: number | null;
    };

    // If the user is already attributed to this exact store, nothing to do
    if (user.referredByStoreId === storeId) return;

    // If the user already has a different attribution, respect first-wins — don't overwrite
    if (user.referredByStoreId) return;

    // User has no attribution yet — call the API to set it
    void fetch("/api/user/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    }).catch(() => {
      // Fire-and-forget — attribution failure is non-critical
    });
  }, [status, session, storeId]);

  return null;
}
