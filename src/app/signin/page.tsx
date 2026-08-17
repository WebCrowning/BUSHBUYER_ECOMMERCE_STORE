"use client";

import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect, Suspense } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Determine where a newly-authenticated user should land.
 *
 * Priority:
 *  1. Admin roles → /admin
 *  2. Vendor / store staff → /seller/dashboard
 *  3. User has a referred store slug → /store/{slug}   (landing page on every login)
 *  4. callbackUrl query param (from protected-page redirect) — only for non-referred users
 *  5. Generic customer dashboard
 */
function resolveRedirect(
  role: string,
  storeIds: number[],
  referredStoreSlug: string | null | undefined,
  callbackUrl: string | null
): string {
  if (
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "admin" ||
    role === "sub_admin"
  ) {
    return "/admin";
  }

  if (storeIds.length > 0) {
    return "/seller/dashboard";
  }

  // Referred customers always land on their attributed store page first.
  // They can navigate away freely after that.
  if (referredStoreSlug) {
    return `/store/${referredStoreSlug}`;
  }

  // For non-referred customers, honour the callbackUrl if it looks safe
  // (relative path only — reject absolute URLs to prevent open-redirect).
  if (callbackUrl) {
    try {
      const decoded = decodeURIComponent(callbackUrl);
      if (decoded.startsWith("/") && !decoded.startsWith("//")) {
        // Skip looping back to the sign-in page itself
        if (!decoded.startsWith("/signin") && !decoded.startsWith("/admin-login")) {
          return decoded;
        }
      }
    } catch {
      // ignore malformed callbackUrl
    }
  }

  return "/dashboard";
}

function SignInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);

  // ── Post-login redirect ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    const role =
      (session.user as { role?: string }).role || "customer";
    const storeIds =
      (session.user as { storeIds?: number[] }).storeIds || [];
    const referredStoreSlug =
      (session.user as { referredStoreSlug?: string | null }).referredStoreSlug;
    const callbackUrl = searchParams.get("callbackUrl");

    const destination = resolveRedirect(role, storeIds, referredStoreSlug, callbackUrl);
    router.replace(destination);
  }, [status, session, router, searchParams]);

  // ── Auth error display ───────────────────────────────────────────────────
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      setError(`Authentication notice: ${authError}`);
    }
  }, [searchParams]);

  // callbackUrl preserved so OAuth providers can return to /signin with it intact
  const callbackUrl =
    searchParams.get("callbackUrl") ?? "/signin";
  const safeCallback =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/signin";

  return (
    <>
      <div className="flex justify-center mb-6">
        <Image
          src="/images/logo.png"
          alt="Bushbuyer logo"
          width={120}
          height={120}
          className="h-28 w-28 rounded-full object-cover shadow-lg"
          priority
          unoptimized
        />
      </div>
      <p className="section-kicker text-center">Multi-Vendor Marketplace</p>
      <h1 className="mt-2 text-3xl font-extrabold text-brand-deep text-center">
        Sign in to Bushbuyer
      </h1>
      <p className="mt-3 text-sm text-foreground/70 text-center leading-relaxed">
        Access your buyer account, store dashboard, or seller portal securely with
        single-click OAuth.
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: safeCallback })}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
        >
          <Image
            src="/images/google.svg"
            alt="Google logo"
            width={22}
            height={22}
            unoptimized
          />
          <span>Continue with Google</span>
        </button>

        <button
          type="button"
          onClick={() => signIn("facebook", { callbackUrl: safeCallback })}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-5 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#166fe5] hover:shadow"
        >
          <Image
            src="/images/facebook.png"
            alt="Facebook logo"
            width={22}
            height={22}
            unoptimized
          />
          <span>Continue with Facebook</span>
        </button>
      </div>

      <div className="mt-10 space-y-3 border-t border-border/60 pt-6 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-foreground/70">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Enterprise Secure OAuth 2.0 Authentication</span>
        </div>
        <p className="text-xs text-foreground/60">
          First-time sign-ins automatically initialize a customer account. Store
          staff and owners receive role privileges automatically.
        </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <SiteHeader />
      <main className="container-shell flex-1 flex items-center justify-center py-16">
        <div className="glass-card w-full max-w-lg rounded-3xl border border-gray-100 bg-white/90 p-8 shadow-xl">
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                Loading authentication...
              </div>
            }
          >
            <SignInFormContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
