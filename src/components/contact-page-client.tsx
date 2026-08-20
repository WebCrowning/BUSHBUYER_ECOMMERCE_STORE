"use client";

import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useTranslation } from "@/hooks/use-translation";

export function ContactPageClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const trimmedEmail = email.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  async function submitMessage() {
    setStatus(null);
    setLoading(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, message }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        const errorText =
          typeof payload.error === "string"
            ? payload.error
            : t("contact_error_send");
        setStatus(errorText);
        return;
      }

      setMessage("");
      setStatus(t("contact_success"));
    } catch {
      setStatus(t("contact_error_unexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="glass-card mx-auto max-w-2xl rounded-3xl p-8">
          <p className="section-kicker">{t("contact_kicker")}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-deep">{t("contact_title")}</h1>
          <p className="mt-3 text-sm text-foreground/70">
            {t("contact_desc")}
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("contact_email_placeholder")}
            className="mt-5 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            required
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("contact_message_placeholder")}
            className="mt-5 min-h-36 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          />

          <button
            type="button"
            disabled={loading || !isValidEmail || message.trim().length < 4}
            onClick={submitMessage}
            className="mt-4 rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("contact_sending") : t("contact_send")}
          </button>

          {!isValidEmail && email.length > 0 ? (
            <p className="mt-2 text-xs text-red-600">{t("contact_invalid_email")}</p>
          ) : null}

          {status ? <p className="mt-3 text-sm">{status}</p> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
