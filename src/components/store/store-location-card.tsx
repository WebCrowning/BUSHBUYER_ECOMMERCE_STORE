"use client";

import { useState } from "react";
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Navigation,
  Compass,
  Zap,
} from "lucide-react";
import { Store } from "@/types/marketplace";
import { StoreGoogleMapModal } from "@/components/store/store-google-map-modal";

interface StoreLocationCardProps {
  store: Store;
  variant?: "full" | "compact" | "badge";
}

export function StoreLocationCard({ store, variant = "full" }: StoreLocationCardProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const rawLat = store.latitude;
  const rawLng = store.longitude;
  const latitude = typeof rawLat === "number" ? rawLat : rawLat ? parseFloat(String(rawLat)) : null;
  const longitude = typeof rawLng === "number" ? rawLng : rawLng ? parseFloat(String(rawLng)) : null;

  const isVerified =
    store.is_location_verified === 1 ||
    store.is_location_verified === true ||
    (latitude !== null && longitude !== null);

  const hasCoords = latitude !== null && longitude !== null;

  const googleMapsDirectionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${store.name} ${store.quarter || ""} ${store.city || ""} Cameroon`
      )}`;

  if (variant === "badge") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 group"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)",
            boxShadow: "0 4px 14px rgba(168, 85, 247, 0.45)",
          }}
        >
          <MapPin className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>{store.city || "Track Store"}</span>
          <span className="text-[10px] bg-white/25 px-1.5 rounded-full font-bold">MAP</span>
        </button>

        <StoreGoogleMapModal store={store} isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">{store.name}</span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-1">
                {store.quarter ? `${store.quarter}, ` : ""}{store.city || "Cameroon"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold text-xs transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)",
              boxShadow: "0 4px 14px rgba(168, 85, 247, 0.45)",
            }}
          >
            <Navigation className="w-3.5 h-3.5" />
            Track on Map
          </button>
        </div>

        <StoreGoogleMapModal store={store} isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </>
    );
  }

  // Full Variant
  return (
    <>
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-gray-900 text-base">Store Location &amp; Google Map</h3>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Physical Location Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Location Pending Seller Validation
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Physical shop address in Cameroon. Track and navigate with Google Maps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-extrabold text-xs transition-all active:scale-95 relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)",
                boxShadow: "0 6px 20px rgba(168, 85, 247, 0.5), 0 2px 8px rgba(219, 39, 119, 0.3)",
              }}
            >
              {/* Shimmer sweep on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              {/* Pulse dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white/80" />
              </span>
              <Zap className="w-4 h-4" />
              Track on Google Map
            </button>
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors"
              title="Open Google Maps directions in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">City &amp; Region</span>
            <p className="font-bold text-gray-900 text-sm">
              {store.city || "Cameroon"} {store.country ? `(${store.country})` : ""}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Neighborhood / Quarter</span>
            <p className="font-bold text-gray-900 text-sm">{store.quarter || "Neighborhood info available"}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Landmark / Reference</span>
            <p className="font-bold text-emerald-800 text-sm truncate">
              {store.landmark || store.address || "Near main commercial hub"}
            </p>
          </div>
        </div>
      </div>

      <StoreGoogleMapModal store={store} isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </>
  );
}
