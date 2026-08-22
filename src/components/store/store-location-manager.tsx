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

  const [gpsState, setGpsState] = useState<GpsPermissionState>("idle");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Selected city object
  const selectedCityObj = CAMEROON_CITIES.find((c) => c.name.toLowerCase() === city.toLowerCase()) || CAMEROON_CITIES[0];

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

        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(acc);
        setGpsState("success");
        setStatusMessage({
          type: "success",
          text: `GPS coordinates captured! (Accuracy: ±${acc}m). Click Save below to confirm.`,
        });
      },
      (err) => {
        // GeolocationPositionError codes:
        // 1 = PERMISSION_DENIED  → browser permission blocked
        // 2 = POSITION_UNAVAILABLE → device GPS / location services off
        // 3 = TIMEOUT
        if (err.code === 1) {
          setGpsState("denied");
        } else if (err.code === 2) {
          setGpsState("unavailable");
        } else {
          // Timeout — treat as unavailable and let user try again
          setGpsState("unavailable");
        }
        setStatusMessage(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleRetry = () => {
    setGpsState("idle");
    setStatusMessage(null);
  };

  // Save location to server
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update store location");
      }

      setStatusMessage({
        type: "success",
        text: "Store GPS location successfully updated and visible to nearby shoppers!",
      });

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
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <Compass size={16} /> Store Geolocation & Cameroon Mapping
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mt-1">
            Store Location & GPS Coordinates
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Turn on GPS when you are at your physical shop so customers nearby can find and visit your store.
          </p>
        </div>

        {latitude && longitude && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle size={13} /> GPS Configured
          </span>
        )}
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm font-medium ${
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

      {/* STATE: idle — show Allow Location CTA */}
      {(gpsState === "idle") && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <MapPin size={12} /> Location Required
              </span>
              <h3 className="text-lg font-bold">Turn on GPS at Your Store</h3>
              <p className="text-xs text-emerald-100/80 max-w-md mt-1 leading-relaxed">
                Stand inside your physical shop and tap below to capture your exact coordinates. Customers nearby will be able to find you.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestLocation}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-sm px-6 py-3.5 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <MapPin className="w-4 h-4" />
              Allow Location
            </button>
          </div>
          {/* Coordinate readout */}
          <GpsReadout latitude={latitude} longitude={longitude} gpsAccuracy={gpsAccuracy} />
        </div>
      )}

      {/* STATE: pre-prompt — our explanation overlay before browser dialog */}
      {gpsState === "pre-prompt" && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
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
            <h3 className="text-lg font-bold text-white mb-1">📍 Location Permission Required</h3>
            <p className="text-sm text-emerald-100/80 mb-5 leading-relaxed max-w-sm mx-auto">
              We need your device location to pin your store on the map for nearby shoppers.
              Your browser will now ask for permission — please tap <strong>Allow</strong>.
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

      {/* STATE: requesting — waiting for browser / device */}
      {gpsState === "requesting" && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="rounded-2xl border border-emerald-600/40 bg-emerald-950/70 p-6 text-center">
            <Loader2 size={36} className="mx-auto mb-3 animate-spin text-emerald-400" />
            <h3 className="text-base font-bold">Detecting GPS&hellip;</h3>
            <p className="text-xs text-emerald-200/70 mt-1">Waiting for your device to respond. This may take a few seconds.</p>
          </div>
        </div>
      )}

      {/* STATE: denied — browser permission blocked */}
      {gpsState === "denied" && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-red-950 to-rose-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
              <ShieldX size={22} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-100">📍 Location Permission Blocked</h3>
              <p className="text-sm text-red-200/80 mt-1 mb-4 leading-relaxed">
                Your browser has blocked location access for this site. To use GPS, you need to allow it in your browser settings.
              </p>

              <div className="rounded-xl bg-red-950/60 border border-red-800/40 p-4 text-xs text-red-200/80 space-y-2 mb-4">
                <p className="font-bold text-red-100 text-sm">How to Enable Location Access</p>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>Open your browser settings or tap the <strong>lock / info icon</strong> in the address bar.</li>
                  <li>Find <strong>Site Settings</strong> → <strong>Location</strong>.</li>
                  <li>Change it from &ldquo;Block&rdquo; to <strong>Allow</strong>.</li>
                  <li>Return to this page and tap <strong>Try Again</strong>.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-red-900 font-extrabold text-sm px-5 py-2.5 shadow transition-all hover:bg-red-50 active:scale-95"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
                <a
                  href="https://support.google.com/chrome/answer/142065"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-500/40 text-red-200 text-sm px-5 py-2.5 hover:bg-red-900/40 transition-colors"
                >
                  <ExternalLink size={13} />
                  How to Enable
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE: unavailable — device GPS / location services off */}
      {gpsState === "unavailable" && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-amber-950 to-orange-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30">
              <WifiOff size={22} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-100">📍 Location is Turned Off</h3>
              <p className="text-sm text-amber-200/80 mt-1 mb-4 leading-relaxed">
                Your device location / GPS appears to be disabled. Please turn on location services and try again.
              </p>

              <div className="rounded-xl bg-amber-950/60 border border-amber-800/40 p-4 text-xs text-amber-200/80 space-y-1.5 mb-4">
                <p className="font-bold text-amber-100 text-sm">How to Turn On Location</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li><strong>Android:</strong> Pull down notification shade → tap <strong>Location</strong> to enable.</li>
                  <li><strong>iPhone:</strong> Settings → Privacy &amp; Security → <strong>Location Services</strong> → On.</li>
                  <li>Then return to this page and tap <strong>Try Again</strong>.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold text-sm px-5 py-2.5 shadow transition-all active:scale-95"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE: success — coordinates captured */}
      {gpsState === "success" && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <CheckCircle size={12} /> Location Captured
              </span>
              <h3 className="text-lg font-bold">GPS Successfully Captured!</h3>
              <p className="text-xs text-emerald-100/80 mt-1">
                Review the coordinates below, then click <strong>Save &amp; Update</strong> to publish.
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

      {/* Manual & Location Form */}
      <form onSubmit={handleSaveLocation} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cameroon City */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Cameroon City / Town *
            </label>
            <select
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            >
              {CAMEROON_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.region} Region)
                </option>
              ))}
            </select>
          </div>

          {/* Quarter / Neighborhood */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Quarter / Neighborhood *
            </label>
            {selectedCityObj.quarters.length > 0 ? (
              <select
                value={quarter}
                onChange={(e) => handleQuarterChange(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
              >
                {selectedCityObj.quarters.map((q) => (
                  <option key={q.name} value={q.name}>
                    {q.name} {q.description ? `— ${q.description}` : ""}
                  </option>
                ))}
                <option value="Other">Other Quarter (specify in address)</option>
              </select>
            ) : (
              <input
                type="text"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                placeholder="e.g. Akwa, Bastos, Molyko"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Landmark / Commercial Reference */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Notable Landmark / Reference Point
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite TotalEnergies, Beside Marché Mokolo, Near Rond-Point"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Helpful for customers navigating Cameroon streets.
            </p>
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
              placeholder="e.g. Boulevard de la Liberté, Immeuble Don Bosco, Door #4"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Manual Latitude & Longitude overrides */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
          <span className="text-xs font-bold text-gray-700 block">
            Exact GPS Coordinates (Auto-filled by GPS or editable)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                Latitude (e.g. 4.051100)
              </label>
              <input
                type="number"
                step="any"
                value={latitude !== null ? latitude : ""}
                onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="4.051100"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-800 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                Longitude (e.g. 9.704200)
              </label>
              <input
                type="number"
                step="any"
                value={longitude !== null ? longitude : ""}
                onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="9.704200"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-800 outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-8 py-3.5 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Saving Location...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save & Update Store Location
              </>
            )}
          </button>
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
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-emerald-300 underline inline-flex items-center gap-1 hover:text-white"
          >
            Maps <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}
