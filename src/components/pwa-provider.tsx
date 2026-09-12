"use client";

import { useEffect, useState } from "react";
import { Download, X, Wifi, WifiOff } from "lucide-react";

// ── Service Worker Registration ────────────────────────────────────────────────
export function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            console.log("[PWA] Service worker registered:", reg.scope);

            // Check for updates
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] New content available. Refresh to update.");
                  }
                });
              }
            });
          })
          .catch((err) => console.warn("[PWA] Service worker registration failed:", err));
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show banner only if user hasn't dismissed before
      const dismissed = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        // Short delay so it doesn't show immediately on page load
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Hide install banner when app is installed
    window.addEventListener("appinstalled", () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log("[PWA] App installed successfully");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] User install choice:", outcome);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <>
      {/* ── Install Banner ────────────────────────────────────────────── */}
      {showInstallBanner && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
          style={{ animation: "slideUp 0.35s ease" }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a3a2a 0%, #0f2a1e 100%)",
              border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: "1.25rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(74,222,128,0.1)",
              padding: "1.125rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
            }}
          >
            {/* Icon */}
            <div
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "0.875rem",
                background: "rgba(74,222,128,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-72x72.png" alt="Bushbuyer" width={28} height={28} style={{ borderRadius: "0.5rem" }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#f0faf4", fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.3, margin: 0 }}>
                Install Bushbuyer App
              </p>
              <p style={{ color: "#9ab8a4", fontSize: "0.75rem", marginTop: 2, lineHeight: 1.4 }}>
                Shop faster, get offline access
              </p>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              id="pwa-install-btn"
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.5rem 0.875rem",
                background: "#22c55e",
                color: "#0a1f12",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Download size={13} />
              Install
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                color: "#6b8f7a",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Offline Toast ─────────────────────────────────────────────── */}
      {showOfflineToast && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            position: "fixed",
            top: "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            background: "#1e293b",
            color: "#f1f5f9",
            padding: "0.625rem 1rem",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.08)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <WifiOff size={14} style={{ color: "#f87171" }} />
          You&apos;re offline — some features may be unavailable
        </div>
      )}

      {/* ── Back Online Toast ─────────────────────────────────────────── */}
      {!isOnline === false && showOfflineToast === false && (
        <div
          style={{
            position: "fixed",
            top: "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            background: "#14532d",
            color: "#bbf7d0",
            padding: "0.625rem 1rem",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <Wifi size={14} />
          Back online!
        </div>
      )}

      {/* ── CSS Animations ────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 1.5rem); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -0.75rem); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
