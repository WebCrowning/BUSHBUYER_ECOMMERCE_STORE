"use client";

import { useCart } from "@/context/cart-context";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useEffect, useMemo, useState } from "react";

function toErrorMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeZod = value as {
      formErrors?: unknown;
      fieldErrors?: Record<string, unknown>;
      message?: unknown;
    };

    if (typeof maybeZod.message === "string" && maybeZod.message.trim()) {
      return maybeZod.message;
    }

    const formErrors = Array.isArray(maybeZod.formErrors)
      ? maybeZod.formErrors.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];

    const fieldErrors = maybeZod.fieldErrors && typeof maybeZod.fieldErrors === "object"
      ? Object.values(maybeZod.fieldErrors)
          .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];

    const first = [...formErrors, ...fieldErrors][0];
    if (first) {
      return first;
    }
  }

  return fallback;
}

function isPopupClosedError(value: unknown) {
  const text =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : (() => {
            try {
              return JSON.stringify(value);
            } catch {
              return "";
            }
          })();

  return /detected popup close|popup close|popup closed|window closed/i.test(text);
}

type PayPalButtonProps = {
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  country: string;
  total: number;
  deliveryMethodId?: number;
  deliveryFee?: number;
  deliveryNotes?: string;
  deliveryDataJson?: string;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function PayPalButton({
  customerName,
  customerEmail,
  phone,
  address,
  country,
  total,
  deliveryMethodId,
  deliveryFee,
  deliveryNotes,
  deliveryDataJson,
  onSuccess,
  onError,
  disabled = false,
  disabledReason,
}: PayPalButtonProps) {
  const { items } = useCart();
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const paypalEnv = (process.env.NEXT_PUBLIC_PAYPAL_ENV ?? process.env.PAYPAL_ENV ?? "sandbox")
    .trim()
    .toLowerCase();
  const isLiveMode = paypalEnv === "live" || paypalEnv === "production";
  const [renderKey, setRenderKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const itemsPayload = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        quantityPackages: item.quantityPackages,
        price: Number(item.price),
        transportFee: Number(item.transportFee),
      })),
    [items],
  );

  const scriptOptions = useMemo(() => {
    const base = {
      clientId: paypalClientId,
      currency: "USD",
      intent: "capture",
    } as {
      clientId: string;
      currency: string;
      intent: string;
      "disable-funding"?: string;
    };

    if (isMobile) {
      // Mobile card popup has unstable close behavior in some browsers.
      base["disable-funding"] = "card";
    }

    return base;
  }, [isMobile, paypalClientId]);

  if (!paypalClientId) {
    return (
      <div className="rounded-lg bg-red-100 border border-red-300 p-4 text-sm text-red-700">
        <p className="font-semibold">PayPal not configured</p>
        <p>Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${isLiveMode ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        PayPal mode: <span className="font-semibold">{isLiveMode ? "Live" : "Sandbox"}</span>
      </div>
    <PayPalScriptProvider
      options={scriptOptions}
    >
      <PayPalButtons
        key={renderKey}
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
        forceReRender={[total]}
        disabled={disabled}
        createOrder={async () => {
          if (disabled) {
            const message = disabledReason || "Checkout is temporarily unavailable.";
            onError(message);
            throw new Error(message);
          }

          const createRes = await fetch("/api/payments/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: itemsPayload,
              total,
            }),
          });

          if (!createRes.ok) {
            const errorData = (await createRes.json().catch(() => ({}))) as {
              error?: unknown;
              productName?: string;
              requestedPackages?: number;
              availablePackages?: number;
            };

            const stockDetail =
              errorData.productName &&
              typeof errorData.requestedPackages === "number" &&
              typeof errorData.availablePackages === "number"
                ? ` ${errorData.productName}: requested ${errorData.requestedPackages}, available ${errorData.availablePackages}.`
                : "";

            const message =
              toErrorMessage(errorData.error, "Failed to create PayPal order") + stockDetail;
            onError(message);
            throw new Error(message);
          }

          const data = (await createRes.json().catch(() => ({}))) as { orderId?: string };
          if (!data.orderId || typeof data.orderId !== "string") {
            const message = "Failed to create PayPal order: missing order id";
            onError(message);
            throw new Error(message);
          }

          return data.orderId;
        }}
        onApprove={async (data) => {
          try {
            if (!data.orderID) {
              onError("Missing PayPal order ID after approval");
              return;
            }

            const captureRes = await fetch("/api/payments/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paypalOrderId: data.orderID,
                items: itemsPayload,
                total,
                customerName,
                customerEmail,
                phone,
                address,
                country,
                delivery_method_id: deliveryMethodId,
                delivery_fee: deliveryFee,
                delivery_notes: deliveryNotes,
                delivery_data_json: deliveryDataJson,
              }),
            });

            if (!captureRes.ok) {
              const errorData = (await captureRes.json().catch(() => ({}))) as {
                error?: unknown;
              };
              onError(toErrorMessage(errorData.error, "Payment verification failed"));
              return;
            }

            const result = (await captureRes.json().catch(() => ({}))) as { ok?: boolean; orderId?: string };
            if (result.ok && result.orderId) {
              onSuccess(result.orderId);
              return;
            }

            onError("Payment processing failed");
          } catch (err) {
            onError(err instanceof Error ? err.message : "Payment capture failed");
          }
        }}
        onError={(err) => {
          if (isPopupClosedError(err)) {
            // Reset the SDK button instance so the popup-close state never gets stuck.
            setRenderKey((prev) => prev + 1);
            return;
          }

          console.error("PayPal error", err);
          onError("PayPal error. Please try again.");
        }}
        onCancel={() => {
          // User intentionally closed checkout; reset the button and keep page usable.
          setRenderKey((prev) => prev + 1);
        }}
      />
    </PayPalScriptProvider>
    </div>
  );
}
