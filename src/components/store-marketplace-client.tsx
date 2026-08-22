"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Store as StoreIcon,
  Search,
  MapPin,
  Navigation,
  Star,
  Phone,
  MessageCircle,
  ShoppingBag,
  ArrowUpDown,
  Filter,
  CheckCircle,
  SlidersHorizontal,
  Compass,
  Building,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import { CAMEROON_CITIES, CameroonCity, CameroonQuarter } from "@/lib/cameroon-locations";
import { calculateDistanceKm, formatDistance, parseCoordinates, Coordinates } from "@/lib/location-utils";
import { StoreWithDetails } from "@/app/api/stores/route";
import { ProductPriceDisplay } from "@/components/product-price-display";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/types";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
}

interface ProductItem extends Product {
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  storeCity?: string;
  storeQuarter?: string;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
  storeGps?: string | null;
  discountPrice?: number | null;
  marketplace_enabled?: number;
}

interface StoreMarketplaceClientProps {
  initialStores: StoreWithDetails[];
  categories: CategoryOption[];
  initialProducts: ProductItem[];
  initialCategory?: string;
  initialQuery?: string;
  initialCity?: string;
  initialQuarter?: string;
}

export function StoreMarketplaceClient({
  initialStores,
  categories,
  initialProducts,
  initialCategory = "All",
  initialQuery = "",
  initialCity = "",
  initialQuarter = "",
}: StoreMarketplaceClientProps) {
  // State
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedQuarter, setSelectedQuarter] = useState(initialQuarter);
  const [sortBy, setSortBy] = useState<"nearest" | "rating" | "products" | "name">("nearest");

  // Buyer Geolocation state
  const [buyerCoords, setBuyerCoords] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("All Cameroon");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Restore saved buyer location from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bushbuyer_buyer_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) {
          setBuyerCoords({ lat: parsed.lat, lng: parsed.lng });
          setLocationLabel(parsed.label || "Custom Location");
        }
      }
    } catch {
      // Ignore parsing error
    }
  }, []);

  // One-click Turn on GPS
  const handleTurnOnGps = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Coordinates = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        };
        setBuyerCoords(coords);
        setLocationLabel("📍 My Current GPS Location");
        setIsDetectingGps(false);
        setIsLocationModalOpen(false);

        try {
          localStorage.setItem(
            "bushbuyer_buyer_location",
            JSON.stringify({ ...coords, label: "📍 My Current GPS Location" })
          );
        } catch {
          // Ignore
        }
      },
      (err) => {
        setIsDetectingGps(false);
        let msg = "Could not get your GPS position.";
        if (err.code === 1) msg = "GPS permission denied. Please allow location access.";
        else if (err.code === 2) msg = "Location unavailable. Please select your city manually.";
        else if (err.code === 3) msg = "GPS request timed out. Please try again.";
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Manual City/Quarter Select
  const handleSelectCameroonLocation = (city: CameroonCity, quarter?: CameroonQuarter) => {
    const lat = quarter ? quarter.lat : city.lat;
    const lng = quarter ? quarter.lng : city.lng;
    const label = quarter ? `${quarter.name}, ${city.name}` : city.name;

    const coords: Coordinates = { lat, lng };
    setBuyerCoords(coords);
    setLocationLabel(label);
    setSelectedCity(city.name);
    if (quarter) setSelectedQuarter(quarter.name);
    else setSelectedQuarter("");

    setIsLocationModalOpen(false);
    setLocationError(null);

    try {
      localStorage.setItem(
        "bushbuyer_buyer_location",
        JSON.stringify({ ...coords, label, city: city.name, quarter: quarter?.name || "" })
      );
    } catch {
      // Ignore
    }
  };

  const handleClearLocation = () => {
    setBuyerCoords(null);
    setLocationLabel("All Cameroon");
    setSelectedCity("");
    setSelectedQuarter("");
    try {
      localStorage.removeItem("bushbuyer_buyer_location");
    } catch {
      // Ignore
    }
  };

  // Filtered & Sorted Stores Calculation
  const computedStores = useMemo(() => {
    let list = [...initialStores];

    // Filter by category
    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter(
        (s) =>
          s.business_category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(s.business_category?.toLowerCase() || "")
      );
    }

    // Filter by city
    if (selectedCity && selectedCity !== "All") {
      list = list.filter((s) => s.city?.toLowerCase() === selectedCity.toLowerCase());
    }

    // Filter by quarter
    if (selectedQuarter && selectedQuarter !== "All") {
      list = list.filter((s) => s.quarter?.toLowerCase() === selectedQuarter.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          s.business_category.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.quarter && s.quarter.toLowerCase().includes(q)) ||
          (s.landmark && s.landmark.toLowerCase().includes(q)) ||
          (s.previewProducts && s.previewProducts.some((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)))
      );
    }

    // Calculate distance for all stores based on active buyerCoords
    const withDistances = list.map((store) => {
      const storeCoords = parseCoordinates(store.latitude, store.longitude, store.gps_coordinates);
      let distanceKm: number | null = null;

      if (buyerCoords && storeCoords && !isNaN(buyerCoords.lat) && !isNaN(buyerCoords.lng)) {
        distanceKm = calculateDistanceKm(
          buyerCoords.lat,
          buyerCoords.lng,
          storeCoords.lat,
          storeCoords.lng
        );
      }

      return {
        ...store,
        distanceKm,
        distanceFormatted: distanceKm !== null ? formatDistance(distanceKm) : undefined,
      };
    });

    // Sorting
    if (buyerCoords && sortBy === "nearest") {
      withDistances.sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
        return (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0);
      });
    } else if (sortBy === "rating") {
      withDistances.sort((a, b) => (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0));
    } else if (sortBy === "products") {
      withDistances.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    } else if (sortBy === "name") {
      withDistances.sort((a, b) => a.name.localeCompare(b.name));
    }

    return withDistances;
  }, [initialStores, selectedCategory, selectedCity, selectedQuarter, searchQuery, buyerCoords, sortBy]);

  // Filtered Products Calculation
  const computedProducts = useMemo(() => {
    let list = [...initialProducts];

    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter(
        (p) =>
          p.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(p.category?.toLowerCase() || "")
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.storeName && p.storeName.toLowerCase().includes(q))
      );
    }

    // Attach distance if available
    return list.map((p) => {
      const coords = parseCoordinates(p.storeLatitude, p.storeLongitude, p.storeGps);
      let distanceKm: number | null = null;
      if (buyerCoords && coords) {
        distanceKm = calculateDistanceKm(buyerCoords.lat, buyerCoords.lng, coords.lat, coords.lng);
      }
      return {
        ...p,
        distanceKm,
        distanceFormatted: distanceKm !== null ? formatDistance(distanceKm) : undefined,
      };
    });
  }, [initialProducts, selectedCategory, searchQuery, buyerCoords]);

  return (
    <div className="space-y-8">
      {/* ── Top Hero & Cameroon Marketplace Header ── */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <StoreIcon size={320} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-500/30">
            <Compass size={14} className="animate-spin-slow" /> Cameroon Stores & Local Markets
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Discover Stores & Shops Across Cameroon
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100/80 leading-relaxed">
            Find registered stores near you in Douala, Yaoundé, Buea, Bamenda, Bafoussam and Limbe. Filter by category, turn on GPS, and connect directly with local sellers.
          </p>
        </div>

        {/* Location & GPS Action Banner */}
        <div className="mt-6 pt-6 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <MapPin size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block">
                Your Search Location
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{locationLabel}</span>
                {buyerCoords && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="text-[11px] text-emerald-300 hover:text-white underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleTurnOnGps}
              disabled={isDetectingGps}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-extrabold px-4 py-2.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Detecting GPS...
                </>
              ) : (
                <>
                  <Navigation size={14} /> Turn on GPS (Find Nearest)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 border border-white/20 transition-all active:scale-95"
            >
              <Building size={14} /> Select City / Quarter
            </button>
          </div>
        </div>

        {locationError && (
          <div className="mt-3 text-xs bg-red-500/20 text-red-200 px-3 py-1.5 rounded-xl border border-red-500/40 inline-block">
            {locationError}
          </div>
        )}
      </div>

      {/* ── Search Bar & View Controls ── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full md:flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stores, electronics, phones, fashion, groceries, quarter..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-all text-gray-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto justify-center">
            <button
              type="button"
              onClick={() => setActiveTab("stores")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === "stores"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <StoreIcon size={14} /> Available Stores ({computedStores.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === "products"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ShoppingBag size={14} /> Store Products ({computedProducts.length})
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Filter size={12} /> Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-emerald-600"
            >
              <option value="nearest">📍 Nearest First (Closest to You)</option>
              <option value="rating">⭐ Highest Rated</option>
              <option value="products">📦 Most Products</option>
              <option value="name">🔤 Store Name (A → Z)</option>
            </select>

            {/* Clear All Filters */}
            {(selectedCategory !== "All" || searchQuery || selectedCity || selectedQuarter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelectedCity("");
                  setSelectedQuarter("");
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-lg bg-emerald-50"
              >
                Clear Filters ×
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{activeTab === "stores" ? computedStores.length : computedProducts.length}</span> {activeTab === "stores" ? "stores" : "products"}
          </div>
        </div>
      </div>

      {/* ── Cameroon Category Filter Pills ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Browse by Store Category
          </h2>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {selectedCategory === "All" ? "All Categories" : selectedCategory}
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
              selectedCategory === "All"
                ? "bg-emerald-700 text-white shadow-emerald-700/20"
                : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
            }`}
          >
            <span>🏪</span> All Stores
          </button>

          {categories.map((c) => {
            const isSelected = selectedCategory.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                  isSelected
                    ? "bg-emerald-700 text-white shadow-emerald-700/20"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                {c.icon && <span className="text-base">{c.icon}</span>}
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STORES TAB VIEW ── */}
      {activeTab === "stores" && (
        <div>
          {computedStores.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                🔍
              </div>
              <h3 className="text-lg font-bold text-gray-900">No stores found matching your search</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Try searching for different keywords (e.g. &quot;Electronics&quot;, &quot;Phones&quot;, &quot;Akwa&quot;) or reset your category and location filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelectedCity("");
                  setSelectedQuarter("");
                }}
                className="mt-5 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {computedStores.map((store) => (
                <article
                  key={store.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Store Cover Banner */}
                  <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
                    {store.banner ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={store.banner}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-emerald-800 to-teal-900 flex items-center justify-center text-white/20">
                        <StoreIcon size={64} />
                      </div>
                    )}

                    {/* Category pill on banner */}
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-white/20">
                      {store.business_category}
                    </span>

                    {/* Distance Badge */}
                    {store.distanceFormatted ? (
                      <span className="absolute top-3 right-3 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white shadow-md flex items-center gap-1">
                        <Navigation size={11} /> {store.distanceFormatted} away
                      </span>
                    ) : null}
                  </div>

                  {/* Store Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Logo + Name */}
                      <div className="flex items-start gap-3.5 -mt-10 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center font-extrabold text-emerald-800 text-lg bg-emerald-50">
                          {store.logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            store.name.substring(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="pt-8 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-base text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                              {store.name}
                            </h3>
                            {store.verification_status === "verified" && (
                              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                            )}
                          </div>

                          {/* Ratings */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <div className="flex items-center text-amber-500">
                              <Star size={12} className="fill-amber-500" />
                            </div>
                            <span className="font-bold text-gray-800">{Number(store.rating_avg || 5.0).toFixed(1)}</span>
                            <span>({store.rating_count || 0} reviews)</span>
                            <span>·</span>
                            <span className="font-semibold text-emerald-700">{store.productCount || 0} products</span>
                          </div>
                        </div>
                      </div>

                      {/* Location & Landmark */}
                      <div className="mt-3 text-xs text-gray-600 flex items-start gap-1.5 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                        <MapPin size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-gray-900">
                            {store.quarter ? `${store.quarter}, ` : ""}
                            {store.city || "Cameroon"}
                          </span>
                          {store.landmark && (
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{store.landmark}</p>
                          )}
                        </div>
                      </div>

                      {/* Store Description */}
                      {store.description && (
                        <p className="mt-2.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {store.description}
                        </p>
                      )}
                    </div>

                    {/* Preview Products */}
                    {store.previewProducts && store.previewProducts.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                          Available in Store
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {store.previewProducts.map((prod) => (
                            <Link
                              key={prod.id}
                              href={`/products/${prod.id}`}
                              className="group/prod block rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-1 hover:border-emerald-300 transition-colors"
                            >
                              <div className="h-14 w-full rounded-lg overflow-hidden bg-white mb-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-full h-full object-cover group-hover/prod:scale-105 transition-transform"
                                />
                              </div>
                              <p className="text-[10px] font-semibold text-gray-800 line-clamp-1 group-hover/prod:text-emerald-700">
                                {prod.name}
                              </p>
                              <p className="text-[10px] font-extrabold text-emerald-800">
                                <ProductPriceDisplay price={prod.price} />
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {store.whatsapp && (
                          <a
                            href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            title="Call Store"
                          >
                            <Phone size={15} />
                          </a>
                        )}
                      </div>

                      <Link
                        href={`/store/${store.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-sm hover:shadow transition-all"
                      >
                        Visit Store <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB VIEW ── */}
      {activeTab === "products" && (
        <div>
          {computedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">No products match your criteria</h3>
              <p className="text-xs text-gray-500 mt-2">
                Try clearing your search query or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {computedProducts.map((product) => {
                const hasDiscount = product.discountPrice && product.discountPrice < product.price;
                const displayPrice = hasDiscount ? product.discountPrice! : product.price;

                return (
                  <article
                    key={product.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                  >
                    {/* Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {hasDiscount && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          SALE
                        </span>
                      )}
                      {product.distanceFormatted && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-700/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow flex items-center gap-1">
                          <Navigation size={9} /> {product.distanceFormatted}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Category & Store Attribution */}
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-bold uppercase tracking-wider text-emerald-700">
                            {product.category}
                          </span>
                          {product.storeName && (
                            <Link
                              href={`/store/${product.storeSlug || ""}`}
                              className="font-bold text-gray-600 hover:text-emerald-700 flex items-center gap-1 truncate max-w-[120px]"
                            >
                              <StoreIcon size={10} /> {product.storeName}
                            </Link>
                          )}
                        </div>

                        <h3 className="mt-1 font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-base font-extrabold text-emerald-900">
                            <ProductPriceDisplay price={displayPrice} />
                          </span>
                          {hasDiscount && (
                            <span className="ml-1 text-xs text-gray-400 line-through">
                              <ProductPriceDisplay price={product.price} />
                            </span>
                          )}
                        </div>

                        <AddToCartButton product={product} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Buyer Cameroon Location Selector Modal ── */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                  Location Preference
                </span>
                <h3 className="text-lg font-extrabold">Select Your Cameroon City / Quarter</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="rounded-full p-2 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* GPS Instant Button */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-emerald-900">Use Exact Device GPS</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Automatically computes distances to shops from your current spot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTurnOnGps}
                  disabled={isDetectingGps}
                  className="shrink-0 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 shadow-sm"
                >
                  {isDetectingGps ? "Detecting..." : "Turn on GPS"}
                </button>
              </div>

              {/* Major Cities List */}
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 block">
                  Select by City & Popular Commercial Quarters
                </span>

                <div className="space-y-3">
                  {CAMEROON_CITIES.map((city) => (
                    <div key={city.name} className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => handleSelectCameroonLocation(city)}
                          className="font-extrabold text-sm text-gray-900 hover:text-emerald-700 flex items-center gap-1.5"
                        >
                          <Building size={14} className="text-emerald-600" />
                          {city.name} ({city.region})
                        </button>
                        <span className="text-[10px] text-gray-400 font-semibold">Entire City</span>
                      </div>

                      {/* Quarters Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {city.quarters.map((q) => (
                          <button
                            key={q.name}
                            type="button"
                            onClick={() => handleSelectCameroonLocation(city, q)}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-xs"
                          >
                            {q.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Clear Location Filter
              </button>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="rounded-xl bg-gray-200 text-gray-800 px-4 py-2 text-xs font-bold hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
