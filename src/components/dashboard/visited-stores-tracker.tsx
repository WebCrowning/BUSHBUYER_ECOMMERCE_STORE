"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Compass,
  Building,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Store as StoreIcon,
  Star,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react";
import { Store, VisitedStore } from "@/types/marketplace";
import { StoreGoogleMapModal } from "@/components/store/store-google-map-modal";

export function VisitedStoresTracker() {
  const [visitedStores, setVisitedStores] = useState<VisitedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [selectedStoreForModal, setSelectedStoreForModal] = useState<Store | null>(null);

  useEffect(() => {
    async function loadVisitedStores() {
      try {
        // Read local storage visited stores
        let localIds: number[] = [];
        try {
          const raw = localStorage.getItem("bushbuyer_visited_stores");
          if (raw) localIds = JSON.parse(raw);
        } catch {
          localIds = [];
        }

        const queryParam = localIds.length > 0 ? `?ids=${localIds.join(",")}` : "";
        const res = await fetch(`/api/user/visited-stores${queryParam}`);
        if (!res.ok) throw new Error("Failed to load visited stores");
        const data = await res.json();
        setVisitedStores(data.visitedStores || []);
      } catch (err) {
        console.error("Error loading visited stores:", err);
      } finally {
        setLoading(false);
      }
    }

    loadVisitedStores();
  }, []);

  const filteredStores = visitedStores.filter((item) => {
    const isVer =
      item.store.is_location_verified === 1 ||
      item.store.is_location_verified === true ||
      (item.store.latitude !== null && item.store.longitude !== null);
    if (filter === "verified") return isVer;
    if (filter === "pending") return !isVer;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
        <p className="text-xs font-semibold text-gray-500">Loading your visited stores and GPS coordinates...</p>
      </div>
    );
  }

  if (visitedStores.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Compass className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No Stores Visited Yet</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-6">
          When you explore marketplace shops and product pages, they will appear here so you can easily track their physical locations and get Google Maps directions.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
        >
          <StoreIcon className="w-4 h-4" />
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4" /> GPS &amp; Google Maps Tracker
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mt-1">Recently Visited Stores</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track verified storefronts you&apos;ve visited, view coordinates, and get Google Maps navigation.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100/80 border border-gray-200 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({visitedStores.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("verified")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === "verified" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-emerald-700"
            }`}
          >
            Verified Only
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-gray-600 hover:text-amber-700"
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStores.map(({ store, visit_count, last_visited_at }) => {
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
            ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${store.name} ${store.quarter || ""} ${store.city || ""} Cameroon`
              )}`;

          return (
            <div
              key={store.id}
              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Store Header */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-emerald-800">
                    {store.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      store.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/store/${store.slug}`}
                      className="font-bold text-gray-900 hover:text-emerald-700 text-sm truncate block transition-colors"
                    >
                      {store.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Location
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Pending Seller Validation
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1 text-xs mb-4">
                  <p className="text-gray-700 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {store.quarter ? `${store.quarter}, ` : ""}
                      {store.city || "Cameroon"}
                    </span>
                  </p>
                  {store.landmark && (
                    <p className="text-[11px] text-gray-500 pl-5 truncate">
                      Ref: {store.landmark}
                    </p>
                  )}
                  {hasCoords && (
                    <p className="text-[10px] font-mono text-gray-400 pl-5">
                      GPS: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <Link
                  href={`/store/${store.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Visit Shop
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStoreForModal(store)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Google Map
                  </button>
                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Direct Google Maps directions"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedStoreForModal && (
        <StoreGoogleMapModal
          store={selectedStoreForModal}
          isOpen={true}
          onClose={() => setSelectedStoreForModal(null)}
        />
      )}
    </div>
  );
}
