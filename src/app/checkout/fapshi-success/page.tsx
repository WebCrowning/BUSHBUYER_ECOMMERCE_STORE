"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/cart-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle, AlertCircle, Loader2, Phone } from "lucide-react";

type VerifyState = "loading" | "success" | "pending" | "failed";

export default function FapshiSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const masterOrderId = searchParams.get("masterOrderId") || "";
  const transIdParam =
    searchParams.get("transId") ||
    searchParams.get("trans_id") ||
    (typeof window !== "undefined" ? sessionStorage.getItem("fapshi_trans_id") || "" : "");

  const [state, setState] = useState<VerifyState>("loading");
  const [confirmedTransId, setConfirmedTransId] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("XAF");
  const [pollCount, setPollCount] = useState(0);

  const finaliseOrder = useCallback(async (transId: string, masterOId: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/payments/fapshi/finalise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transId, masterOrderId: masterOId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.orderId ?? null;
      }
    } catch { /* non-fatal */ }
    return null;
  }, []);

  const verify = useCallback(async (currentTransId: string) => {
    try {
      const res = await fetch(`/api/payments/fapshi/verify?transId=${encodeURIComponent(currentTransId)}`);
      const data = await res.json();

      if (data.confirmed && data.status === "SUCCESSFUL") {
        const orderId = await finaliseOrder(currentTransId, masterOrderId);
        setState("success");
        setConfirmedTransId(data.transId);
        setConfirmedOrderId(orderId);
        setAmount(data.amount);
        setCurrency(data.currency || "XAF");
        clearCart();
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("fapshi_master_order_id");
          sessionStorage.removeItem("fapshi_trans_id");
        }
      } else if (data.status === "PENDING") {
        setState("pending");
      } else {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  }, [clearCart, finaliseOrder, masterOrderId]);

  useEffect(() => {
    const tid = transIdParam;
    if (!tid) { setState("failed"); return; }
    verify(tid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state !== "pending" || pollCount >= 5) return;
    const timer = setTimeout(() => {
      const tid = transIdParam;
      if (tid) { setPollCount((c) => c + 1); verify(tid); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, pollCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-transparent">
      <SiteHeader />
      <main className="container-shell py-16">
        <div className="max-w-lg mx-auto">

          {state === "loading" && (
            <div className="rounded-2xl border border-border/50 bg-white p-10 text-center shadow-sm">
              <div className="flex justify-center mb-4"><Loader2 className="h-12 w-12 text-brand animate-spin" /></div>
              <h1 className="text-xl font-bold text-brand-deep mb-2">Verifying Payment</h1>
              <p className="text-sm text-foreground/60">Please wait while we confirm your Mobile Money payment with Fapshi…</p>
            </div>
          )}

          {state === "pending" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center shadow-sm">
              <div className="flex justify-center mb-4"><Loader2 className="h-12 w-12 text-amber-500 animate-spin" /></div>
              <h1 className="text-xl font-bold text-amber-700 mb-2">Payment Pending</h1>
              <p className="text-sm text-amber-600 mb-4">
                Your payment is being processed.{pollCount < 5 ? " Checking again in a moment…" : " This is taking longer than usual."}
              </p>
              {pollCount >= 5 && (
                <p className="text-xs text-amber-600 mb-6">If you completed the payment, you will receive a confirmation SMS. Your order will be updated automatically.</p>
              )}
              <Link href="/dashboard" className="inline-block rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">View My Orders</Link>
            </div>
          )}

          {state === "success" && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-9 w-9 text-emerald-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-brand-deep mb-2">Payment Confirmed!</h1>
              <p className="text-sm text-foreground/60 mb-2">Your Mobile Money payment was successful.</p>
              {confirmedTransId && <p className="text-xs text-foreground/40 mb-1">Transaction: <span className="font-mono font-semibold">{confirmedTransId}</span></p>}
              {confirmedOrderId && <p className="text-xs text-foreground/50 mb-1">Order: <span className="font-semibold text-brand-deep">{confirmedOrderId}</span></p>}
              {amount && <p className="text-xs text-foreground/40 mb-6">Amount: <span className="font-semibold">{amount.toLocaleString()} {currency}</span></p>}
              <div className="space-y-3">
                {confirmedOrderId ? (
                  <Link href={`/orders/${confirmedOrderId}?payment=success`} className="block w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-deep text-center">View My Order</Link>
                ) : (
                  <Link href="/dashboard" className="block w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-deep text-center">View My Orders</Link>
                )}
                <Link href="/products" className="block w-full rounded-xl border border-border/50 bg-white px-6 py-3 text-sm font-semibold text-foreground/70 hover:bg-surface-soft text-center">Continue Shopping</Link>
              </div>
            </div>
          )}

          {state === "failed" && (
            <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-9 w-9 text-red-500" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-red-700 mb-2">Payment Could Not Be Confirmed</h1>
              <p className="text-sm text-foreground/60 mb-4">This may happen if:</p>
              <ul className="text-xs text-foreground/55 mb-6 space-y-1 text-left bg-red-50 rounded-xl p-4">
                <li>• The payment was cancelled or timed out</li>
                <li>• Insufficient mobile money balance</li>
                <li>• Network issues during the transaction</li>
              </ul>
              <div className="space-y-3">
                <button type="button" onClick={() => router.push("/checkout")} className="block w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-deep text-center">Try Again</button>
                <Link href="/contact" className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 bg-white px-6 py-3 text-sm font-semibold text-foreground/70 hover:bg-surface-soft">
                  <Phone className="h-4 w-4" /> Contact Support
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
