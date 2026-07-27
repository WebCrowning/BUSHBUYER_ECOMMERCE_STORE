"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect, Suspense } from "react";

function SignInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  function getUserRole(user: unknown) {
    if (!user || typeof user !== "object") return "user";
    const maybeRole = (user as { role?: unknown }).role;
    const maybeName = (user as { name?: unknown }).name;
    if (maybeRole === "admin") return "admin";
    if (maybeName === "Admin") return "admin";
    return "user";
  }

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Redirect based on user role
      const isAdmin = getUserRole(session.user) === "admin";
      const redirectPath = isAdmin ? "/admin" : "/dashboard";
      router.push(redirectPath);
    }
  }, [status, session, router]);

  useEffect(() => {
    const authError = searchParams.get("error");
    const authCode = searchParams.get("code");
    if (authError || authCode) {
      setError(`Auth error: ${authError ?? "unknown"}${authCode ? ` (code: ${authCode})` : ""}`);
      setDebugInfo(`URL params -> error=${authError ?? ""}, code=${authCode ?? ""}`);
    }
  }, [searchParams]);

  return (
    <>
      <div className="flex justify-center mb-6">
        <Image
          src="/images/logo.png"
          alt="Bushbuyer logo"
          width={120}
          height={120}
          className="h-32 w-32 rounded-full object-cover"
          priority
        />
      </div>
      <p className="section-kicker text-center">Authentication</p>
      <h1 className="mt-3 text-3xl font-bold text-brand-deep text-center">Sign in to Bushbuyer</h1>
      <p className="mt-3 text-sm text-foreground/70 text-center">
        Continue with your preferred social account to place orders and track deliveries.
      </p>

      {error && (
        <div className="mt-6 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
          {error}
        </div>
      )}
      {debugInfo && (
        <pre className="mt-2 max-h-48 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
          {debugInfo}
        </pre>
      )}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-soft cursor-pointer"
        >
          <div className="flex items-center justify-center gap-3">
            <Image src="/images/google.svg" alt="Google logo" width={20} height={20} />
            <span>Continue with Google</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => signIn("facebook", { callbackUrl: "/" })}
          className="w-full rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-3">
            <Image src="/images/facebook.png" alt="Facebook logo" width={20} height={20} />
            <span>Continue with Facebook</span>
          </div>
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-border/60 text-center">
        <p className="text-xs text-foreground/60">
          Are you an administrator?{" "}
          <a
            href="/admin-login"
            className="font-semibold text-brand hover:text-brand-deep underline underline-offset-2"
          >
            Sign in via Admin Portal &rarr;
          </a>
        </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-shell py-16">
        <div className="glass-card mx-auto max-w-lg rounded-3xl p-8">
          <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <SignInFormContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
