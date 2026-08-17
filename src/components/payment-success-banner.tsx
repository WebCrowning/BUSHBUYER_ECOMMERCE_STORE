"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, ShieldCheck } from "lucide-react";

interface PaymentSuccessBannerProps {
  orderId: string;
  gateway: string;
  amount: number;
}

export function PaymentSuccessBanner({ orderId, gateway, amount }: PaymentSuccessBannerProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 12_000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const gatewayLabel = gateway === "fapshi" ? "Fapshi Mobile Money" : "PayPal";
  const currency = gateway === "fapshi" ? "XAF" : "USD";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-emerald-900">
            Payment Confirmed!
          </h2>
          <p className="mt-0.5 text-sm text-emerald-800">
            Your payment of{" "}
            <span className="font-bold">{formattedAmount}</span> via{" "}
            <span className="font-bold">{gatewayLabel}</span> was received
            successfully. Order{" "}
            <span className="font-mono font-bold">{orderId}</span> is now being
            processed.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-emerald-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1">
              <ShieldCheck size={12} />
              Verified &amp; Secured
            </span>
            <span className="text-emerald-600/70">
              You will receive an email confirmation shortly.
            </span>
          </div>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1.5 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar auto-dismiss indicator */}
      <div className="h-0.5 bg-emerald-100">
        <div
          className="h-full bg-emerald-500 origin-left"
          style={{
            animation: "shrink-width 12s linear forwards",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shrink-width {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
