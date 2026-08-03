"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { FormEvent, useState, useEffect, Suspense } from "react";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // If user is already authenticated as admin/sub_admin, redirect to /admin
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as { role?: string }).role;
      const userEmail = session.user.email?.toLowerCase();
      const isAdminRole = userRole === "admin" || userRole === "sub_admin";

      if (isAdminRole) {
        router.push("/admin");
      }
    }
  }, [status, session, router]);

  const urlError = getUrlErrorMessage(errorParam);
  const displayError = formError
    ? { title: "Authentication Failed", message: formError }
    : urlError;

  function getUrlErrorMessage(param: string | null) {
    if (!param) return null;
    if (param === "forbidden") {
      return {
        title: "Access Forbidden",
        message: "Your account is not authorized for administrative access. Please sign in with an admin account.",
      };
    }
    if (param === "CredentialsSignin" || param === "Credentials" || param === "credentials") {
      return {
        title: "Authentication Failed",
        message: "Invalid admin email or password. Please check your credentials and try again.",
      };
    }
    if (param === "AccessDenied") {
      return {
        title: "Access Denied",
        message: "You do not have permission to access the administrative portal.",
      };
    }
    return {
      title: "Authentication Error",
      message: "Authentication failed. Please check your admin credentials and try again.",
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: "/admin",
      });

      setSubmitting(false);

      if (result?.error) {
        setFormError("Invalid admin email or password. Please check your credentials.");
        return;
      }

      if (!result?.ok) {
        setFormError("Invalid admin email or password. Please check your credentials.");
        return;
      }

      window.location.href = "/admin";
    } catch (err) {
      setSubmitting(false);
      setFormError("Invalid admin email or password. Please check your credentials.");
    }
  }

  return (
    <div className="w-full">
      {/* Brand & Portal Header */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-brand opacity-30 blur-sm"></div>
          <Image
            src="/images/logo.png"
            alt="Bushbuyer logo"
            width={96}
            height={96}
            className="relative h-24 w-24 rounded-full object-cover shadow-md"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Independent Admin Portal</span>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Admin Authentication
        </h1>
        <p className="mt-2 text-sm text-foreground/70 max-w-sm">
          Sign in with your administrative credentials to manage store operations, orders, and content.
        </p>
      </div>

      {/* Error Alert Display */}
      {displayError && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold">{displayError.title}</p>
            <p className="mt-0.5 text-xs text-red-700/90 dark:text-red-400">
              {displayError.message}
            </p>
          </div>
        </div>
      )}

      {/* Admin Login Credentials Form */}
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {/* Email Input Field */}
        <div>
          <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-1.5">
            Admin Email Address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-foreground/40">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="admin@bushbuyer.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Password Input Field */}
        <div>
          <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-1.5">
            Admin Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-foreground/40">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-background pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-foreground/40 hover:text-foreground/80 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Admin Session */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/75 hover:text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
            />
            <span>Keep administrative session active</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 shadow-sm shadow-brand/20"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Sign In to Admin Dashboard</span>
            </>
          )}
        </button>
      </form>

      {/* Navigation back to storefront */}
      <div className="mt-8 pt-6 border-t border-border/60 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Storefront</span>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container-shell py-12 md:py-20 flex items-center justify-center">
        <div className="glass-card w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl border border-border/80 bg-surface/90 backdrop-blur-md">
          <Suspense fallback={<div className="flex justify-center py-12 text-sm text-foreground/60"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
