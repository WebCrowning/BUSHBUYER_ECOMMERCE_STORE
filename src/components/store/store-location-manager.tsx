"use client";

import { useState } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Building,
  Compass,
  ExternalLink,
  ShieldX,
  WifiOff,
  X,
  RefreshCw,
  ShieldCheck,
  Map as MapIcon,
  Sparkles,
  LocateFixed,
  Wand2,
} from "lucide-react";
import { CAMEROON_CITIES } from "@/lib/cameroon-locations";
import { Store } from "@/types/marketplace";

// GPS permission state machine
type GpsPermissionState =
  | "idle"        // Not yet requested — show Allow Location prompt
  | "pre-prompt"  // User clicked Allow — show our explanation before browser dialog
  | "requesting"  // Browser native dialog is showing / we're waiting
  | "success"     // Coordinates captured
  | "denied"      // Browser permission denied
  | "unavailable"; // Device GPS / location services are off

interface StoreLocationManagerProps {
  store: Store;
  onUpdated?: (updatedStore: Store) => void;
}

export function StoreLocationManager({ store, onUpdated }: StoreLocationManagerProps) {
  const [city, setCity] = useState(store.city || "Douala");
  const [quarter, setQuarter] = useState(store.quarter || "Akwa");
  const [landmark, setLandmark] = useState(store.landmark || "");
  const [address, setAddress] = useState(store.address || "");
  const [latitude, setLatitude] = useState<number | null>(
    typeof store.latitude === "number"
      ? store.latitude
      : store.latitude
      ? parseFloat(String(store.latitude))
      : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    typeof store.longitude === "number"
      ? store.longitude
      : store.longitude
      ? parseFloat(String(store.longitude))
      : null
  );

  const [isLocationVerified, setIsLocationVerified] = useState<boolean>(
    store.is_location_verified === 1 || store.is_location_verified === true
  );
  const [verifiedAt, setVerifiedAt] = useState<string | null>(store.location_verified_at || null);
  const [verifiedAccuracy, setVerifiedAccuracy] = useState<number | null>(
    store.location_accuracy_meters || null
  );

  const [gpsState, setGpsState] = useState<GpsPermissionState>("idle");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [autoDetectedData, setAutoDetectedData] = useState<{
    city?: string;
    quarter?: string;
    address?: string;
    landmark?: string;
    businessName?: string | null;
    road?: string | null;
  } | null>(null);
  const [mapEngine, setMapEngine] = useState<"google" | "osm">("google");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Selected city object
  const selectedCityObj =
    CAMEROON_CITIES.find((c) => c.name.toLowerCase() === city.toLowerCase()) || CAMEROON_CITIES[0];

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const found = CAMEROON_CITIES.find((c) => c.name.toLowerCase() === newCity.toLowerCase());
    if (found && found.quarters.length > 0) {
      setQuarter(found.quarters[0].name);
      if (!latitude || !longitude) {
        setLatitude(found.quarters[0].lat);
        setLongitude(found.quarters[0].lng);
      }
    }
  };

  const handleQuarterChange = (newQuarter: string) => {
    setQuarter(newQuarter);
    const foundQ = selectedCityObj?.quarters.find((q) => q.name.toLowerCase() === newQuarter.toLowerCase());
    if (foundQ && (!latitude || !longitude || gpsAccuracy === null)) {
      setLatitude(foundQ.lat);
      setLongitude(foundQ.lng);
    }
  };

  // Auto-resolve nearest location & business name from coordinates
  const handleAutoResolveLocation = async (latVal: number, lngVal: number, isManual = false) => {
    try {
      setResolvingLocation(true);
      const res = await fetch(`/api/location/reverse-geocode?lat=${latVal}&lng=${lngVal}`);
      const result = await res.json();

      if (res.ok && result.success && result.data) {
        const d = result.data;
        if (d.city) setCity(d.city);
        if (d.quarter) setQuarter(d.quarter);
        if (d.address) setAddress(d.address);
        if (d.landmark) setLandmark(d.landmark);

        setAutoDetectedData(d);
        setStatusMessage({
          type: "success",
          text: `✨ Nearest location & area data auto-filled: ${d.quarter}, ${d.city}${
            d.landmark ? ` (${d.landmark})` : ""
          }. You can fine-tune any field below.`,
        });
      } else if (isManual) {
        setStatusMessage({
          type: "info",
          text: "Location resolved using nearest reference points. Please confirm the details below.",
        });
      }
    } catch (err: any) {
      console.error("Auto resolve error:", err);
      if (isManual) {
        setStatusMessage({
          type: "error",
          text: "Could not auto-fill address details. You can enter them manually.",
        });
      }
    } finally {
      setResolvingLocation(false);
    }
  };

  // Step 1: User taps "Allow Location" — show our pre-prompt explanation first
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGpsState("unavailable");
      return;
    }
    setGpsState("pre-prompt");
  };

  // Step 2: User confirmed in our overlay — now trigger the real browser dialog
  const handleTriggerBrowserPrompt = () => {
    setGpsState("requesting");
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        // Check if inside reasonable Cameroon coordinates bounds
        const isWithinCameroon = lat >= 1.5 && lat <= 13.5 && lng >= 8.4 && lng <= 16.5;

        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(acc);
        setGpsState("success");

        if (isWithinCameroon) {
          setStatusMessage({
            type: "success",
            text: `GPS coordinates captured! (Accuracy: ±${acc}m). Detecting nearest business & address data...`,
          });
        } else {
          setStatusMessage({
            type: "info",
            text: `GPS captured: ${lat}, ${lng} (Accuracy: ±${acc}m). Detecting nearest address data...`,
          });
        }

        // Auto-fill area, quarter, city, street address and nearest business landmark!
        handleAutoResolveLocation(lat, lng, false);
      },
      (err) => {
        if (err.code === 1) {
          setGpsState("denied");
        } else if (err.code === 2) {
          setGpsState("unavailable");
        } else {
          setGpsState("unavailable");
        }
        setStatusMessage(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleRetry = () => {
    setGpsState("idle");
    setStatusMessage(null);
  };

  // Save or Validate location to server
  const handleSaveLocation = async (validate = false) => {
    if (validate) {
      setValidating(true);
    } else {
      setSaving(true);
    }
    setStatusMessage(null);

    try {
      const res = await fetch("/api/seller/store-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          city,
          quarter,
          landmark,
          address,
          latitude,
          longitude,
          gps_coordinates: latitude && longitude ? `${latitude}, ${longitude}` : null,
          country: "Cameroon",
          is_validated: validate,
          accuracy: gpsAccuracy || verifiedAccuracy,
          verification_method: gpsAccuracy ? "gps_live" : "manual_confirmed",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update store location");
      }

      if (validate) {
        setIsLocationVerified(true);
        setVerifiedAt(new Date().toISOString());
        if (gpsAccuracy) setVerifiedAccuracy(gpsAccuracy);
        setStatusMessage({
          type: "success",
          text: "🎉 Store physical location officially validated! Buyers can now track your store and open turn-by-turn directions on Google Maps.",
        });
      } else {
        setStatusMessage({
          type: "success",
          text: "Store location information saved successfully!",
        });
      }

      if (onUpdated && data.store) {
        onUpdated(data.store);
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save store location",
      });
    } finally {
      setSaving(false);
      setValidating(false);
    }
  };

  const mapEmbedUrl =
    latitude && longitude ? `https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&output=embed` : null;

  const latVal = latitude ?? 4.0511;
  const lngVal = longitude ?? 9.7042;
  const delta = 0.015;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lngVal - delta}%2C${
    latVal - delta
  }%2C${lngVal + delta}%2C${latVal + delta}&layer=mapnik&marker=${latVal}%2C${lngVal}`;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header & Verification Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <Compass size={16} /> Store Geolocation &amp; Verification System
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mt-1">
            Physical Shop Location &amp; Google Map Setup
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
            Validate your physical storefront coordinates so customers in Cameroon can locate your shop and get Google Maps turn-by-turn directions.
          </p>
        </div>

        {isLocationVerified ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <div>
              <span>Location Verified</span>
              {verifiedAt && (
                <span className="block text-[10px] font-normal text-emerald-600">
                  {new Date(verifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Verification Required
          </span>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : statusMessage.type === "error"
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>{statusMessage.text}</div>
        </div>
      )}

      {/* ── GPS Permission State Machine ── */}

      {/* STATE: idle */}
      {gpsState === "idle" && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <MapPin size={12} /> Auto-Capture GPS
              </span>
              <h3 className="text-lg font-bold">Validate Location via Device GPS</h3>
              <p className="text-xs text-emerald-100/80 max-w-md mt-1 leading-relaxed">
                Stand inside your physical shop in Cameroon and tap below to capture your high-precision coordinates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestLocation}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-sm px-6 py-3.5 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              Capture Device GPS
            </button>
          </div>
          <GpsReadout latitude={latitude} longitude={longitude} gpsAccuracy={gpsAccuracy || verifiedAccuracy} />
        </div>
      )}

      {/* STATE: pre-prompt */}
      {gpsState === "pre-prompt" && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="relative rounded-2xl border border-emerald-600/40 bg-emerald-950/70 p-6 text-center">
            <button
              type="button"
              onClick={() => setGpsState("idle")}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Cancel"
            >
              <X size={16} className="text-emerald-300" />
            </button>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
              <MapPin size={28} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">📍 Live GPS Location Required</h3>
            <p className="text-sm text-emerald-100/80 mb-5 leading-relaxed max-w-sm mx-auto">
              We will capture your exact coordinates to pin your store on Google Maps. Please tap <strong>Allow</strong> when prompted by your browser.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleTriggerBrowserPrompt}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-sm px-7 py-3.5 shadow-md transition-all active:scale-95"
              >
                <Navigation className="w-4 h-4" />
                Allow Location
              </button>
              <button
                type="button"
                onClick={() => setGpsState("idle")}
                className="text-xs text-emerald-300/70 hover:text-emerald-200 underline"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE: requesting */}
      {gpsState === "requesting" && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="rounded-2xl border border-emerald-600/40 bg-emerald-950/70 p-6 text-center">
            <Loader2 size={36} className="mx-auto mb-3 animate-spin text-emerald-400" />
            <h3 className="text-base font-bold">Acquiring GPS Signal&hellip;</h3>
            <p className="text-xs text-emerald-200/70 mt-1">Calibrating satellite position. Please wait a moment.</p>
          </div>
        </div>
      )}

      {/* STATE: denied */}
      {gpsState === "denied" && (
        <div className="rounded-2xl bg-gradient-to-br from-red-950 to-rose-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
              <ShieldX size={22} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-100">📍 Location Permission Denied</h3>
              <p className="text-sm text-red-200/80 mt-1 mb-4 leading-relaxed">
                Your browser blocked location access. You can either unblock location in your browser address bar or manually enter coordinates below.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-red-900 font-extrabold text-sm px-5 py-2.5 shadow transition-all hover:bg-red-50"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE: unavailable */}
      {gpsState === "unavailable" && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-950 to-orange-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30">
              <WifiOff size={22} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-100">📍 Location Services Off</h3>
              <p className="text-sm text-amber-200/80 mt-1 mb-4 leading-relaxed">
                Please ensure GPS / Location is turned on in your device settings.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold text-sm px-5 py-2.5 shadow transition-all"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE: success */}
      {gpsState === "success" && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <CheckCircle size={12} /> GPS Verified
              </span>
              <h3 className="text-lg font-bold">GPS Coordinates Captured!</h3>
              <p className="text-xs text-emerald-100/80 mt-1">
                Accuracy: ±{gpsAccuracy}m. Click <strong>Validate &amp; Verify Physical Store</strong> below to certify your storefront.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/40 text-emerald-300 text-sm px-5 py-2.5 hover:bg-emerald-900/50 transition-colors"
            >
              <RefreshCw size={14} />
              Re-capture
            </button>
          </div>
          <GpsReadout latitude={latitude} longitude={longitude} gpsAccuracy={gpsAccuracy} />
        </div>
      )}

      {/* Live Map Preview */}
      {latitude && longitude && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Live Store Map Preview
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setMapEngine("google")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mapEngine === "osm"
                      ? "bg-white text-emerald-800 font-bold shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Satellite / OSM
                </button>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
              >
                Test Driving Route <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video sm:aspect-[21/7] shadow-inner">
            <iframe
              key={mapEngine}
              title="Store Location Map Preview"
              src={mapEngine === "google" ? mapEmbedUrl! : osmEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}

      {/* Manual & Location Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveLocation(false);
        }}
        className="space-y-6 pt-2"
      >
        {/* Latitude & Longitude & Auto-Fill Trigger */}
        <div className="p-5 rounded-2xl bg-gray-50/90 border border-gray-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Exact GPS Coordinates
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Auto-captured by GPS or manually entered to locate your store on Cameroon maps.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (latitude !== null && longitude !== null) {
                  handleAutoResolveLocation(latitude, longitude, true);
                }
              }}
              disabled={resolvingLocation || latitude === null || longitude === null}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-40"
              title="Automatically detect and fill city, quarter, address, and nearby business/landmark based on coordinates"
            >
              {resolvingLocation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  Detecting Area &amp; Business...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
                  Auto-Fill Nearest Area &amp; Business
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Latitude (e.g. 4.051100)
              </label>
              <input
                type="number"
                step="any"
                value={latitude !== null ? latitude : ""}
                onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="4.051100"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Longitude (e.g. 9.704200)
              </label>
              <input
                type="number"
                step="any"
                value={longitude !== null ? longitude : ""}
                onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="9.704200"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {autoDetectedData && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5 flex-wrap">
                  <span>✨ Auto-Detected Location:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-extrabold">
                    {autoDetectedData.quarter}, {autoDetectedData.city}
                  </span>
                  {autoDetectedData.businessName && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 font-bold">
                      🏢 {autoDetectedData.businessName}
                    </span>
                  )}
                </div>
                <p className="text-emerald-800/90 text-[11px] leading-relaxed">
                  Input fields below have been populated with the closest street, quarter, and landmark. You can adjust or customize any field below.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cameroon City / Town */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center justify-between">
              <span>City / Town *</span>
              <span className="text-[10px] text-gray-400 font-normal">Accurate device locality</span>
            </label>
            <input
              type="text"
              list="cameroon-cities-list"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Douala, Yaoundé, Buea, Soa..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
            <datalist id="cameroon-cities-list">
              {CAMEROON_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.region} Region)
                </option>
              ))}
            </datalist>
          </div>

          {/* Quarter / Neighborhood / Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center justify-between">
              <span>Quarter / Neighborhood / Area *</span>
              <span className="text-[10px] text-gray-400 font-normal">Exact physical area</span>
            </label>
            <input
              type="text"
              list="cameroon-quarters-list"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              placeholder="e.g. Olembe, Akwa, Bastos, Molyko, Emana..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
            <datalist id="cameroon-quarters-list">
              {selectedCityObj?.quarters.map((q) => (
                <option key={q.name} value={q.name}>
                  {q.name} {q.description ? `— ${q.description}` : ""}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Notable Landmark / Reference Point */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center justify-between">
              <span>Notable Landmark / Business Reference</span>
              <span className="text-[10px] text-gray-400 font-normal lowercase">(helps buyers locate shop)</span>
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite TotalEnergies, Beside Marché Central"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {/* Full Physical Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Full Physical Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Boulevard de la Liberté, Door #4"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {isLocationVerified
              ? "✓ Verified location is live on Google Maps for shoppers."
              : "⚠️ Validating certifies your store and unlocks full Google Maps navigation for buyers."}
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving || validating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs px-5 py-3.5 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleSaveLocation(true)}
              disabled={saving || validating || !latitude || !longitude}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3.5 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  Validate &amp; Verify Physical Store
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Shared GPS coordinate readout ──────────────────────────────────────────
function GpsReadout({
  latitude,
  longitude,
  gpsAccuracy,
}: {
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
}) {
  return (
    <div className="mt-5 pt-4 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
      <div className="bg-emerald-950/60 rounded-xl p-2.5 border border-emerald-800/40">
        <span className="text-emerald-300/70 block text-[10px] uppercase font-bold">Latitude</span>
        <span className="font-mono font-bold text-white text-sm">
          {latitude !== null ? latitude.toFixed(6) : "Not set"}
        </span>
      </div>

      <div className="bg-emerald-950/60 rounded-xl p-2.5 border border-emerald-800/40">
        <span className="text-emerald-300/70 block text-[10px] uppercase font-bold">Longitude</span>
        <span className="font-mono font-bold text-white text-sm">
          {longitude !== null ? longitude.toFixed(6) : "Not set"}
        </span>
      </div>

      <div className="col-span-2 sm:col-span-1 bg-emerald-950/60 rounded-xl p-2.5 border border-emerald-800/40 flex items-center justify-between">
        <div>
          <span className="text-emerald-300/70 block text-[10px] uppercase font-bold">GPS Accuracy</span>
          <span className="font-bold text-emerald-300 text-sm">
            {gpsAccuracy !== null ? `±${gpsAccuracy}m` : "—"}
          </span>
        </div>
        {latitude && longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-emerald-300 underline inline-flex items-center gap-1 hover:text-white"
          >
            Route <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}
