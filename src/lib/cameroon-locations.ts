/**
 * Cameroon Market Locations & Categories Data
 * Provides comprehensive geographical references for Cameroon commercial hubs and market categories.
 */

export interface CameroonQuarter {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export interface CameroonCity {
  name: string;
  region: string;
  lat: number;
  lng: number;
  quarters: CameroonQuarter[];
}

export const CAMEROON_CITIES: CameroonCity[] = [
  {
    name: "Douala",
    region: "Littoral",
    lat: 4.051056,
    lng: 9.767868,
    quarters: [
      { name: "Akwa", lat: 4.0511, lng: 9.7042, description: "Commercial & Business Center, Electronics & Gadgets" },
      { name: "Bonanjo", lat: 4.0435, lng: 9.6895, description: "Administrative district & Corporate Offices" },
      { name: "Bonamoussadi", lat: 4.0815, lng: 9.7392, description: "Residential & Modern Shopping Centers" },
      { name: "Deido", lat: 4.0621, lng: 9.7123, description: "Rond Point Deido & Cultural Hub" },
      { name: "Ndokoti", lat: 4.0489, lng: 9.7421, description: "Major junction, Wholesale Market & Auto Parts" },
      { name: "Makepe", lat: 4.0872, lng: 9.7541, description: "Modern Residential & Boutiques" },
      { name: "Bepanda", lat: 4.0655, lng: 9.7310, description: "Omnisports & Busy Trade Zone" },
      { name: "Bali", lat: 4.0378, lng: 9.6980, description: "Historic & Commercial Residential" },
      { name: "New Bell", lat: 4.0315, lng: 9.7210, description: "Marché Central & Marché Nkololoun" },
      { name: "Kotto", lat: 4.0950, lng: 9.7580, description: "Residential area" },
      { name: "Logpom", lat: 4.0820, lng: 9.7750, description: "Growing Commercial & Residential" },
      { name: "PK8 - PK14", lat: 4.0580, lng: 9.7890, description: "University & Wholesale Corridor" },
      { name: "Yassa", lat: 4.0150, lng: 9.8050, description: "Japoma Stadium Area" },
    ],
  },
  {
    name: "Yaoundé",
    region: "Centre",
    lat: 3.8480,
    lng: 11.5021,
    quarters: [
      { name: "Bastos", lat: 3.8895, lng: 11.5122, description: "Diplomatic & Upscale Boutiques" },
      { name: "Mokolo", lat: 3.8732, lng: 11.4981, description: "Marché Mokolo, Textiles & Electronics" },
      { name: "Centre-ville", lat: 3.8667, lng: 11.5167, description: "Avenue Kennedy, Commercial Center" },
      { name: "Omnisports", lat: 3.8814, lng: 11.5369, description: "Stade Ahmadou Ahidjo Area" },
      { name: "Tsinga", lat: 3.8810, lng: 11.5030, description: "Near Mokolo, Trade Hub" },
      { name: "Biyem-Assi", lat: 3.8420, lng: 11.4850, description: "Dense Residential & Local Markets" },
      { name: "Mendong", lat: 3.8290, lng: 11.4720, description: "Supermarkets & Residential" },
      { name: "Nsam", lat: 3.8260, lng: 11.5080, description: "Marché Nsam & SCDP Area" },
      { name: "Mvan", lat: 3.8180, lng: 11.5200, description: "Bus Travel Agency Hub" },
      { name: "Ngoa-Ekellé", lat: 3.8560, lng: 11.5010, description: "University of Yaounde I Campus" },
      { name: "Essos", lat: 3.8750, lng: 11.5450, description: "Lively Commerce & Nightlife" },
      { name: "Santa Barbara", lat: 3.9010, lng: 11.5250, description: "Residential Zone" },
    ],
  },
  {
    name: "Buea",
    region: "South West",
    lat: 4.1550,
    lng: 9.2435,
    quarters: [
      { name: "Molyko", lat: 4.1560, lng: 9.2810, description: "University of Buea & Tech Corridor" },
      { name: "Clerks Quarters", lat: 4.1610, lng: 9.2420, description: "Town Center & Administrative" },
      { name: "Bonduma", lat: 4.1480, lng: 9.2670, description: "Gate area & student hub" },
      { name: "Mile 16 (Bolifamba)", lat: 4.1280, lng: 9.3120, description: "Buea entry gate & markets" },
      { name: "Great Soppo", lat: 4.1580, lng: 9.2550, description: "Commercial & residential" },
      { name: "Bokwango", lat: 4.1420, lng: 9.2310, description: "Traditional mountain community" },
    ],
  },
  {
    name: "Bamenda",
    region: "North West",
    lat: 5.9631,
    lng: 10.1591,
    quarters: [
      { name: "Commercial Avenue", lat: 5.9602, lng: 10.1517, description: "Primary retail & wholesale hub" },
      { name: "Up Station", lat: 5.9450, lng: 10.1650, description: "Administrative seat" },
      { name: "Main Market (Food Market)", lat: 5.9570, lng: 10.1540, description: "Central produce market" },
      { name: "Nkwen", lat: 5.9750, lng: 10.1800, description: "Mile 2 to Mile 6 bustling trade" },
      { name: "Mile 4", lat: 5.9850, lng: 10.1920, description: "Commercial corridor" },
      { name: "Mankon", lat: 5.9620, lng: 10.1430, description: "Cultural & commercial zone" },
    ],
  },
  {
    name: "Bafoussam",
    region: "West",
    lat: 5.4778,
    lng: 10.4176,
    quarters: [
      { name: "Marché A (Central)", lat: 5.4778, lng: 10.4176, description: "Central commercial market" },
      { name: "Marché B", lat: 5.4820, lng: 10.4250, description: "Agricultural produce market" },
      { name: "Djeleng", lat: 5.4850, lng: 10.4320, description: "Bustling town center" },
      { name: "Famla", lat: 5.4650, lng: 10.4100, description: "Residential & shops" },
    ],
  },
  {
    name: "Limbe",
    region: "South West",
    lat: 4.0244,
    lng: 9.2149,
    quarters: [
      { name: "Down Beach", lat: 4.0167, lng: 9.2167, description: "Seaside fish market & restaurants" },
      { name: "Half Mile", lat: 4.0220, lng: 9.2100, description: "Commercial avenue" },
      { name: "Bota", lat: 4.0090, lng: 9.1890, description: "Historic port area" },
      { name: "New Town", lat: 4.0280, lng: 9.2230, description: "Residential & shopping" },
    ],
  },
  {
    name: "Kribi",
    region: "South",
    lat: 2.9390,
    lng: 9.9100,
    quarters: [
      { name: "Centre Commercial", lat: 2.9390, lng: 9.9100, description: "Town center & markets" },
      { name: "Mboa Manga", lat: 2.9450, lng: 9.9050, description: "Fish landing site" },
      { name: "Ngoye", lat: 2.9320, lng: 9.9180, description: "Beachfront & hotels" },
    ],
  },
  {
    name: "Garoua",
    region: "North",
    lat: 9.3000,
    lng: 13.4000,
    quarters: [
      { name: "Marché Central", lat: 9.3010, lng: 13.4010, description: "Grand Central Market" },
      { name: "Marouaré", lat: 9.3100, lng: 13.3950, description: "Commercial district" },
    ],
  },
];

/**
 * Curated Cameroon Market Store Categories
 */
export interface CameroonMarketCategory {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  keywords: string[];
}

export const CAMEROON_MARKET_CATEGORIES: CameroonMarketCategory[] = [
  {
    name: "Electronics & Computing",
    slug: "electronics-computing",
    icon: "💻",
    color: "#3B82F6",
    description: "Computers, laptops, TVs, audio systems, smart screens & IT hardware",
    keywords: ["electronics", "computer", "laptop", "tv", "screen", "audio", "subwoofer", "printer"],
  },
  {
    name: "Phones & Gadgets",
    slug: "phones-gadgets",
    icon: "📱",
    color: "#06B6D4",
    description: "Smartphones, tablets, power banks, chargers, cases & accessories",
    keywords: ["phone", "smartphone", "iphone", "samsung", "tecno", "infinix", "airpods", "gadget", "charger"],
  },
  {
    name: "Fashion & Clothing",
    slug: "fashion-clothing",
    icon: "👗",
    color: "#EC4899",
    description: "Men, women & kids wear, shoes, bags, traditional outfits & tailoring",
    keywords: ["fashion", "clothing", "dress", "shoes", "bag", "suit", "african fabric", "wax", "pagne"],
  },
  {
    name: "Food & Groceries",
    slug: "food-groceries",
    icon: "🛒",
    color: "#10B981",
    description: "Fresh foods, spices, provisions, supermarket items, packaged goods",
    keywords: ["food", "groceries", "rice", "oil", "tomato", "spices", "market", "provisions", "snack"],
  },
  {
    name: "African Raw Foods & Spices",
    slug: "african-raw-foods",
    icon: "🌿",
    color: "#22C55E",
    description: "Authentic dried fish, eru, snails, njangsang, bush meat, egusi, palm oil",
    keywords: ["raw foods", "dried fish", "eru", "snails", "njangsang", "egusi", "palm oil", "garri"],
  },
  {
    name: "Building Materials & Hardware",
    slug: "building-hardware",
    icon: "🛠️",
    color: "#F97316",
    description: "Quincaillerie, cement, tiles, plumbing, electrical fittings & tools",
    keywords: ["hardware", "quincaillerie", "building", "cement", "tiles", "plumbing", "tools", "cables"],
  },
  {
    name: "Beauty, Cosmetics & Hair",
    slug: "beauty-cosmetics",
    icon: "💄",
    color: "#8B5CF6",
    description: "Skincare, perfumes, hair weaves, wigs, makeup & salon products",
    keywords: ["beauty", "cosmetics", "perfume", "hair", "wig", "skincare", "lotion", "makeup"],
  },
  {
    name: "Auto & Motorbike Parts",
    slug: "auto-parts",
    icon: "🚗",
    color: "#64748B",
    description: "Car & moto spare parts, tires, batteries, lubricants & accessories",
    keywords: ["auto", "car parts", "moto", "tires", "battery", "oil", "spare parts", "brake"],
  },
  {
    name: "Home Appliances & Furniture",
    slug: "home-furniture",
    icon: "🛋️",
    color: "#F59E0B",
    description: "Fridges, gas cookers, blenders, sofas, beds, decor & kitchenware",
    keywords: ["appliances", "furniture", "fridge", "cooker", "sofa", "bed", "kitchen", "blender"],
  },
  {
    name: "Health & Pharmacy",
    slug: "health-pharmacy",
    icon: "💊",
    color: "#EF4444",
    description: "Parapharmacy, wellness supplements, medical devices & first aid",
    keywords: ["health", "pharmacy", "medicine", "vitamins", "supplements", "first aid", "bandage"],
  },
  {
    name: "Books, Stationery & Office",
    slug: "books-stationery",
    icon: "📚",
    color: "#14B8A6",
    description: "School supplies, books, printing paper, office equipment & stationery",
    keywords: ["books", "stationery", "school", "office", "paper", "pen", "notebook", "textbook"],
  },
  {
    name: "Traditional Arts & Crafts",
    slug: "traditional-crafts",
    icon: "🎨",
    color: "#D97706",
    description: "Handcrafted woodwork, Bamileke beadwork, traditional masks & sculptures",
    keywords: ["crafts", "art", "woodwork", "beads", "masks", "handcrafted", "traditional", "carving"],
  },
];

/**
 * Finds the nearest Cameroon city, quarter, and landmark based on given GPS coordinates.
 */
export function findNearestCameroonLocation(lat: number, lng: number): {
  city: CameroonCity;
  quarter: CameroonQuarter | null;
  distanceKm: number;
  isCloseMatch: boolean; // within 25km of the quarter/city
} {
  let nearestCity = CAMEROON_CITIES[0];
  let nearestQuarter: CameroonQuarter | null = null;
  let minDistance = Infinity;

  for (const city of CAMEROON_CITIES) {
    // Check quarters in this city
    for (const q of city.quarters) {
      const dist = computeHaversineKm(lat, lng, q.lat, q.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestCity = city;
        nearestQuarter = q;
      }
    }

    // Check city center
    const cityDist = computeHaversineKm(lat, lng, city.lat, city.lng);
    if (cityDist < minDistance) {
      minDistance = cityDist;
      nearestCity = city;
      // Default to first quarter if any
      nearestQuarter = city.quarters[0] || null;
    }
  }

  return {
    city: nearestCity,
    quarter: nearestQuarter,
    distanceKm: Math.round(minDistance * 100) / 100,
    isCloseMatch: minDistance <= 35, // within reasonable Cameroon urban radius
  };
}

function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
