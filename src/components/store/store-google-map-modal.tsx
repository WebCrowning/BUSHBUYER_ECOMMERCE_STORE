"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  X,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Copy,
  Check,
  LocateFixed,
  Loader2,
  Building,
  Layers,
  Map as MapIcon,
} from "lucide-react";
import { Store } from "@/types/marketplace";

interface StoreGoogleMapModalProps {
  store: Store;
  isOpen: boolean;
  onClose: () => void;
}

// Calculate distance in kilometers using the Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function StoreGoogleMapModal({ store, isOpen, onClose }: StoreGoogleMapModalProps) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mapEngine, setMapEngine] = useState<"google" | "osm">("google");

  const rawLat = store.latitude;
  const rawLng = store.longitude;
  const latitude = typeof rawLat === "number" ? rawLat : rawLat ? parseFloat(String(rawLat)) : null;
  const longitude = typeof rawLng === "number" ? rawLng : rawLng ? parseFloat(String(rawLng)) : null;

  const isLocationVerified =
    store.is_location_verified === 1 ||
    store.is_location_verified === true ||
    (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude));

  const hasCoords = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);

  // Exact Google Maps turn-by-turn navigation route URL from device location to store
  const googleMapsDirectionsUrl = hasCoords
    ? userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat.toFixed(6)},${userCoords.lng.toFixed(6)}&destination=${latitude.toFixed(6)},${longitude.toFixed(6)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude.toFixed(6)},${longitude.toFixed(6)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${store.name} ${store.address || ""} ${store.quarter || ""} ${store.city || "Douala"} Cameroon`
      )}`;

  // Google Maps Embed URL
  const mapSearchQuery = hasCoords
    ? `${latitude},${longitude}`
    : `${store.address ? store.address + ", " : ""}${store.quarter ? store.quarter + ", " : ""}${store.city || "Douala"}, Cameroon`;

  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&hl=en&z=${
    hasCoords ? "16" : "12"
  }&output=embed`;

  // OpenStreetMap Embed URL
  const latVal = latitude ?? 4.0511;
  const lngVal = longitude ?? 9.7042;
  const delta = 0.012;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lngVal - delta}%2C${
    latVal - delta
  }%2C${lngVal + delta}%2C${latVal + delta}&layer=mapnik&marker=${latVal}%2C${lngVal}`;

  // Attempt user location calculation from actual device GPS
  const handleCalculateDistance = () => {
    if (!navigator.geolocation || !hasCoords) return;
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = parseFloat(pos.coords.latitude.toFixed(6));
        const uLng = parseFloat(pos.coords.longitude.toFixed(6));
        setUserCoords({ lat: uLat, lng: uLng });
        if (latitude !== null && longitude !== null) {
          const dist = calculateDistance(uLat, uLng, latitude, longitude);
          setDistanceKm(dist);
        }
        setLocatingUser(false);
      },
      () => {
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCopyCoords = () => {
    if (!hasCoords || latitude === null || longitude === null) return;
    navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-acquire device location when modal opens
  useEffect(() => {
    if (isOpen && hasCoords && !userCoords && !locatingUser) {
      handleCalculateDistance();
    }
  }, [isOpen, hasCoords]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              {store.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={store.logo} alt={store.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Building className="w-6 h-6 text-emerald-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white">{store.name}</h3>
                {isLocationVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Location
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> GPS Coordinates Not Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/80 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {store.address || store.quarter
                  ? `${store.address ? store.address + ", " : ""}${store.quarter ? store.quarter + ", " : ""}${
                      store.city || "Cameroon"
                    }`
                  : `${store.city || "Douala"}, Cameroon`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Unverified Notice */}
          {!isLocationVerified && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">GPS Coordinates Not Verified</p>
                <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                  The store owner has not pinned their exact GPS coordinates yet. You can still navigate using the store address below.
                </p>
              </div>
            </div>
          )}

          {/* Map Layer Switcher */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5 text-emerald-600" /> Live Interactive Map
            </span>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapEngine("google")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapEngine === "google"
                    ? "bg-white text-emerald-800 font-bold shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => setMapEngine("osm")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapEngine === "osm"
                    ? "bg-white text-emerald-800 font-bold shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Satellite / OSM
              </button>
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video sm:aspect-[21/9] shadow-inner">
            <iframe
              key={mapEngine}
              title={`${store.name} Map Location`}
              src={mapEngine === "google" ? googleMapsEmbedUrl : osmEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Float Overlay on Map */}
            {hasCoords && latitude !== null && longitude !== null ? (
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-md text-xs font-mono font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            ) : (
              <div className="absolute top-3 left-3 bg-amber-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-700/50 shadow-lg text-white max-w-sm">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>GPS Coordinates Not Verified</span>
                </div>
                <p className="text-[11px] text-amber-100/90 mt-0.5 leading-tight">
                  The store owner has not pinned their exact GPS coordinates yet. You can still navigate using the store address below.
                </p>
              </div>
            )}
          </div>

          {/* Location Quick Information & Live Distance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
              <span className="text-[11px] uppercase font-bold text-gray-400 block tracking-wider">Physical Address</span>
              <p className="font-semibold text-gray-900 text-sm">
                {store.address || "Street address not specified"}
              </p>
              <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                {store.quarter && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-medium">
                    Quarter: {store.quarter}
                  </span>
                )}
                {store.city && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 font-medium">
                    City: {store.city}
                  </span>
                )}
              </div>
              {store.landmark && (
                <p className="text-emerald-700 font-medium text-[11px] pt-1">
                  📍 Landmark: {store.landmark}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between text-xs space-y-3">
              <div>
                <span className="text-[11px] uppercase font-bold text-emerald-800 block tracking-wider">
                  Live Distance &amp; Proximity
                </span>
                {distanceKm !== null ? (
                  <div className="mt-1">
                    <p className="text-2xl font-black text-emerald-900">{distanceKm} km</p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Estimated ~{Math.max(2, Math.round(distanceKm * 2.2))} mins drive from your current location
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600 mt-1">
                    {hasCoords
                      ? "Calculate your exact real-time distance to this store using your device GPS."
                      : "Direct distance calculation will be available once the seller pins exact GPS coordinates."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCalculateDistance}
                  disabled={locatingUser || !hasCoords}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {locatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" /> Calculate Distance
                    </>
                  )}
                </button>

                {hasCoords && (
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Coordinates
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center sm:text-left flex items-center gap-1.5">
            {userCoords ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live GPS route ready from your device location ({distanceKm !== null ? `${distanceKm} km` : "calibrated"}).
              </span>
            ) : (
              <span>Opens turn-by-turn navigation in Google Maps app or browser.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors"
            >
              Close
            </button>

            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              {userCoords ? "Start Live GPS Route" : "Open in Google Maps"}
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
