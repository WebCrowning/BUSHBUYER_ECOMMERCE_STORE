"use client";

import { useState, useEffect } from "react";
import { QrCode, Copy, Check, Download, Share2, Loader2 } from "lucide-react";

interface StoreQrCodeProps {
  storeName: string;
  /** Server-rendered URL — may contain localhost. The component overrides with
   *  the real origin on the client so the QR code always encodes the correct URL. */
  storeUrl: string;
}

export function StoreQrCode({ storeName, storeUrl }: StoreQrCodeProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  // Replace the server-rendered origin (may be localhost) with the real browser origin
  const [resolvedUrl, setResolvedUrl] = useState(storeUrl);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(storeUrl);
        parsed.host = window.location.host;
        parsed.protocol = window.location.protocol;
        setResolvedUrl(parsed.toString());
      } catch {
        // storeUrl is relative or malformed — use as-is with current origin
        const path = storeUrl.startsWith("/") ? storeUrl : `/${storeUrl}`;
        setResolvedUrl(`${window.location.origin}${path}`);
      }
    }
  }, [storeUrl]);

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=16&data=${encodeURIComponent(resolvedUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = resolvedUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /**
   * Download via canvas to avoid CORS issues.
   * Draws the remote QR image onto a canvas then exports as a PNG blob.
   * Falls back to opening the image URL in a new tab if canvas fails.
   */
  const handleDownload = async () => {
    setDownloading(true);
    const filename = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr-code.png`;

    try {
      // Load image into an HTMLImageElement with crossOrigin allowed
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = qrApiUrl;
      });

      // Draw to canvas and export as PNG blob
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 400;
      canvas.height = img.naturalHeight || 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          window.open(qrApiUrl, "_blank");
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }, "image/png");
    } catch {
      // Final fallback — open image in new tab so user can save manually
      window.open(qrApiUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm backdrop-blur transition-colors hover:bg-gray-100"
      >
        <QrCode className="h-4 w-4 text-emerald-600" />
        <span>Share &amp; QR Code</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 rounded-3xl bg-white p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Share2 className="h-5 w-5 text-emerald-600" />
                Share {storeName}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center py-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrApiUrl}
                  alt={`${storeName} QR Code`}
                  width={192}
                  height={192}
                  className="h-48 w-48 rounded-xl object-contain"
                />
              </div>
              <p className="mt-2.5 text-center text-xs text-gray-500">
                Scan with your phone camera to open the store
              </p>
            </div>

            {/* URL copy row */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
              <input
                type="text"
                readOnly
                value={resolvedUrl}
                className="flex-1 bg-transparent px-2 font-mono text-xs text-gray-700 outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Action buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Saving…" : "Download QR"}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out ${storeName} on Bushbuyer Marketplace: ${resolvedUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {/* WhatsApp logo inline SVG to avoid external asset dependency */}
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.828L0 24l6.335-1.498A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 01-5.006-1.373l-.36-.213-3.757.887.931-3.659-.234-.375A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
