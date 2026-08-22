/**
 * scripts/seed-cameroon-stores.js
 * Seeds Cameroon Market Categories and 15 Realistic Dummy Stores with GPS coordinates & products.
 */
const mysql = require("mysql2/promise");

const CAMEROON_CATEGORIES = [
  {
    name: "Electronics & Computing",
    slug: "electronics-computing",
    icon: "💻",
    color: "#3B82F6",
    description: "Computers, laptops, 4K TVs, audio sound systems, smart screens & IT hardware",
    sort_order: 1,
  },
  {
    name: "Phones & Gadgets",
    slug: "phones-gadgets",
    icon: "📱",
    color: "#06B6D4",
    description: "Smartphones, iPhones, Samsung, Tecno, AirPods, power banks, chargers & accessories",
    sort_order: 2,
  },
  {
    name: "Fashion & Clothing",
    slug: "fashion-clothing",
    icon: "👗",
    color: "#EC4899",
    description: "Men & women wear, African wax print fabrics, shoes, bags & boutique fashion",
    sort_order: 3,
  },
  {
    name: "Food & Groceries",
    slug: "food-groceries",
    icon: "🛒",
    color: "#10B981",
    description: "Fresh foods, spices, provisions, supermarket items & pantry essentials",
    sort_order: 4,
  },
  {
    name: "African Raw Foods & Spices",
    slug: "african-raw-foods",
    icon: "🌿",
    color: "#22C55E",
    description: "Authentic dried fish, eru, snails, njangsang, egusi, bush meat & pure red palm oil",
    sort_order: 5,
  },
  {
    name: "Building Materials & Hardware",
    slug: "building-hardware",
    icon: "🛠️",
    color: "#F97316",
    description: "Quincaillerie, cement, tiles, plumbing, electrical fittings, paint & power tools",
    sort_order: 6,
  },
  {
    name: "Beauty, Cosmetics & Hair",
    slug: "beauty-cosmetics",
    icon: "💄",
    color: "#8B5CF6",
    description: "Skincare lotions, perfumes, human hair weaves, wigs, makeup & salon products",
    sort_order: 7,
  },
  {
    name: "Auto & Motorbike Parts",
    slug: "auto-parts",
    icon: "🚗",
    color: "#64748B",
    description: "Car & motorbike spare parts, tires, batteries, brake pads, filters & lubricants",
    sort_order: 8,
  },
  {
    name: "Home Appliances & Furniture",
    slug: "home-furniture",
    icon: "🛋️",
    color: "#F59E0B",
    description: "Refrigerators, gas cookers, blenders, living room sofas, beds & kitchen utensils",
    sort_order: 9,
  },
  {
    name: "Health & Pharmacy",
    slug: "health-pharmacy",
    icon: "💊",
    color: "#EF4444",
    description: "Parapharmacy, wellness supplements, vitamins, first aid kits & medical devices",
    sort_order: 10,
  },
  {
    name: "Books, Stationery & Office",
    slug: "books-stationery",
    icon: "📚",
    color: "#14B8A6",
    description: "School books, stationery supplies, printing paper, office equipment & art supplies",
    sort_order: 11,
  },
  {
    name: "Traditional Arts & Crafts",
    slug: "traditional-crafts",
    icon: "🎨",
    color: "#D97706",
    description: "Handcrafted woodwork, Bamileke beadwork, traditional masks, bangles & sculptures",
    sort_order: 12,
  },
];

const DUMMY_STORES = [
  {
    name: "Afritech Electronics & Computers",
    slug: "afritech-electronics-douala",
    business_category: "Electronics & Computing",
    city: "Douala",
    quarter: "Akwa",
    landmark: "Boulevard de la Liberté, Opposite Direction MTN",
    address: "Bld de la Liberté, Akwa, Douala",
    latitude: 4.0511,
    longitude: 9.7042,
    gps_coordinates: "4.0511, 9.7042",
    phone: "+237 677 123 456",
    whatsapp: "+237 677 123 456",
    email: "contact@afritech-douala.cm",
    description: "Premier electronics retailer in Douala Akwa. Genuine laptops (HP, Dell, Apple MacBook), Smart 4K TVs, home theaters and IT components with 1-year warranty.",
    logo: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.9,
    rating_count: 48,
    products: [
      { name: "HP Pavilion 15 Core i7 16GB/512GB SSD", price: 650.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80", desc: "High performance laptop for business, programming and multimedia." },
      { name: "Samsung 55-inch Crystal 4K Smart UHD TV", price: 520.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80", desc: "Vibrant colors, HDR10+, built-in Netflix, YouTube and AirPlay 2." },
      { name: "Sony Powerful Bluetooth Soundbar & Subwoofer", price: 180.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80", desc: "Cinematic audio experience with deep bass for living room." },
    ],
  },
  {
    name: "Douala Phone Hub & Gadgets",
    slug: "douala-phone-hub-akwa",
    business_category: "Phones & Gadgets",
    city: "Douala",
    quarter: "Akwa",
    landmark: "Rue Pau, Beside Orange Cameroon Center",
    address: "Rue Pau, Akwa, Douala",
    latitude: 4.0535,
    longitude: 9.7065,
    gps_coordinates: "4.0535, 9.7065",
    phone: "+237 699 876 543",
    whatsapp: "+237 699 876 543",
    email: "sales@doualaphonehub.cm",
    description: "Official reseller of Apple iPhones, Samsung Galaxy, Tecno, Infinix, AirPods Pro, and fast charging gear. Express screen repair and accessories.",
    logo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.8,
    rating_count: 62,
    products: [
      { name: "Apple iPhone 15 Pro 128GB Titanium", price: 1050.00, category: "Phones & Gadgets", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80", desc: "Brand new sealed iPhone 15 Pro with official Apple warranty." },
      { name: "Tecno Camon 30 Premier 5G (512GB / 12GB RAM)", price: 340.00, category: "Phones & Gadgets", image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80", desc: "Ultra-clear periscope camera, 70W ultra charge, AMOLED 120Hz." },
      { name: "Anker 20,000mAh Fast Power Bank 65W PD", price: 45.00, category: "Phones & Gadgets", image: "https://images.unsplash.com/photo-1609592424368-e54452140bb9?auto=format&fit=crop&w=600&q=80", desc: "Heavy duty battery pack capable of charging phones & USB-C laptops." },
    ],
  },
  {
    name: "Mokolo Fashion Palace",
    slug: "mokolo-fashion-palace-yaounde",
    business_category: "Fashion & Clothing",
    city: "Yaoundé",
    quarter: "Mokolo",
    landmark: "Marché Mokolo, Entrée Principale Sapeurs",
    address: "Marché Mokolo, Yaoundé",
    latitude: 3.8732,
    longitude: 11.4981,
    gps_coordinates: "3.8732, 11.4981",
    phone: "+237 675 334 455",
    whatsapp: "+237 675 334 455",
    email: "contact@mokolofashion.cm",
    description: "The heartbeat of Yaoundé fashion. Authentic Dutch Wax Hollandais, Senator suits, Italian leather shoes, women dresses and tailored embroidery.",
    logo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.7,
    rating_count: 35,
    products: [
      { name: "Authentic Vlisco Super Wax (6 Yards)", price: 85.00, category: "Fashion & Clothing", image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80", desc: "Top grade 100% cotton wax print with vibrant long-lasting colors." },
      { name: "Men Luxury Embroidered Senator Suit (Complete Set)", price: 95.00, category: "Fashion & Clothing", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80", desc: "Tailored African formal wear with subtle gold chest embroidery." },
      { name: "Handcrafted Men Italian Leather Loafers", price: 60.00, category: "Fashion & Clothing", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80", desc: "Genuine leather slip-ons with cushioned insole." },
    ],
  },
  {
    name: "K-Mart Supermarket & Groceries",
    slug: "kmart-groceries-bonamoussadi",
    business_category: "Food & Groceries",
    city: "Douala",
    quarter: "Bonamoussadi",
    landmark: "Rond-Point Bonamoussadi, Near TotalEnergies",
    address: "Avenue Paul Doumer, Bonamoussadi, Douala",
    latitude: 4.0815,
    longitude: 9.7392,
    gps_coordinates: "4.0815, 9.7392",
    phone: "+237 650 112 233",
    whatsapp: "+237 650 112 233",
    email: "orders@kmart-douala.cm",
    description: "Full-service modern supermarket in Douala North. Fresh bakery, dairy, meats, basmati rice, imported oils, beverages and everyday household provisions.",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.8,
    rating_count: 53,
    products: [
      { name: "Royal Basmati Rice 25kg Bag", price: 38.00, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80", desc: "Extra long grain fragrant Indian Basmati rice." },
      { name: "Mayor Refined Vegetable Cooking Oil (5 Liters)", price: 14.50, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80", desc: "Cholesterol free refined cooking oil for frying and stews." },
      { name: "Gino Concentrated Tomato Paste (Carton 50 Sachets)", price: 16.00, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80", desc: "Rich red tomato paste for African sauces and jollof rice." },
    ],
  },
  {
    name: "Bastos Organic Food & Spices",
    slug: "bastos-organic-spices-yaounde",
    business_category: "African Raw Foods & Spices",
    city: "Yaoundé",
    quarter: "Bastos",
    landmark: "Behind Greek Embassy, Bastos",
    address: "Rue 1812, Bastos, Yaoundé",
    latitude: 3.8895,
    longitude: 11.5122,
    gps_coordinates: "3.8895, 11.5122",
    phone: "+237 671 998 877",
    whatsapp: "+237 671 998 877",
    email: "info@bastosorganic.cm",
    description: "Premium packaged African raw food ingredients: sun-dried ocean fish, cleaned giant snails, oven-dried eru, Cameroon pepper, white penja pepper and pure organic palm oil.",
    logo: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1506484381205-f7945653044d?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 5.0,
    rating_count: 42,
    products: [
      { name: "Penja White Pepper PGI (500g Glass Jar)", price: 22.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80", desc: "World famous volcanic soil white pepper with delicate aroma." },
      { name: "Cleaned Giant African Land Snails (1kg Vacuum Pack)", price: 28.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80", desc: "Freshly cleaned and packed snails ready for cooking." },
      { name: "Sun-Dried Premium Mangrove Snapper Fish (Pack of 10)", price: 24.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=600&q=80", desc: "Rich flavored dried fish for traditional African soups." },
    ],
  },
  {
    name: "Buea Digital Haven",
    slug: "buea-digital-haven-molyko",
    business_category: "Electronics & Computing",
    city: "Buea",
    quarter: "Molyko",
    landmark: "Opposite University of Buea Main Gate",
    address: "Molyko Commercial Strip, Buea",
    latitude: 4.1560,
    longitude: 9.2810,
    gps_coordinates: "4.1560, 9.2810",
    phone: "+237 674 556 677",
    whatsapp: "+237 674 556 677",
    email: "hello@bueadigital.cm",
    description: "Buea Silicon Mountain favorite electronics hub! Laptops for coders, graphic designers and students. WiFi routers, SSD upgrades, mechanical keyboards and monitors.",
    logo: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.9,
    rating_count: 39,
    products: [
      { name: "Dell Latitude 5420 Core i5 11th Gen (16GB RAM)", price: 420.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80", desc: "Rugged business ultrabook with backlit keyboard and fast NVMe." },
      { name: "LG 27-inch IPS Full HD 75Hz Frameless Monitor", price: 165.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80", desc: "Crystal clear display for dual-screen productivity." },
      { name: "TP-Link 4G LTE High-Speed Dual-Band WiFi Router", price: 68.00, category: "Electronics & Computing", image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", desc: "Insert any CAMTEL, MTN or Orange SIM card and connect 32 devices." },
    ],
  },
  {
    name: "Commercial Ave Hardware & Tools",
    slug: "commercial-ave-hardware-bamenda",
    business_category: "Building Materials & Hardware",
    city: "Bamenda",
    quarter: "Commercial Avenue",
    landmark: "Beside Commercial Bank Cameroon, Commercial Ave",
    address: "Commercial Avenue, Bamenda",
    latitude: 5.9602,
    longitude: 10.1517,
    gps_coordinates: "5.9602, 10.1517",
    phone: "+237 677 443 322",
    whatsapp: "+237 677 443 322",
    email: "hardware@bamendatools.cm",
    description: "Leading building supply & quincaillerie in Bamenda. Bosch power tools, cement, roofing sheets, PVC pipes, brass fittings, electrical cables & interior paints.",
    logo: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.6,
    rating_count: 27,
    products: [
      { name: "Bosch Professional Cordless Hammer Drill 18V Kit", price: 140.00, category: "Building Materials & Hardware", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80", desc: "Heavy duty drill with 2 lithium batteries and carrying case." },
      { name: "Seigneurie Washable Interior Wall Paint (20 Liters)", price: 75.00, category: "Building Materials & Hardware", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80", desc: "High coverage premium satin emulsion in brilliant white." },
      { name: "Complete Brass Bathroom Shower & Mixer Set", price: 55.00, category: "Building Materials & Hardware", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80", desc: "Rust-proof chrome-plated luxury rainfall shower unit." },
    ],
  },
  {
    name: "Glamour Cosmetics & Hair Beauty",
    slug: "glamour-cosmetics-yaounde-centre",
    business_category: "Beauty, Cosmetics & Hair",
    city: "Yaoundé",
    quarter: "Centre-ville",
    landmark: "Avenue Kennedy, Immeuble Don Bosco",
    address: "Avenue Kennedy, Centre-ville, Yaoundé",
    latitude: 3.8667,
    longitude: 11.5167,
    gps_coordinates: "3.8667, 11.5167",
    phone: "+237 690 223 344",
    whatsapp: "+237 690 223 344",
    email: "beauty@glamouryaounde.cm",
    description: "Exclusive perfumes, genuine French and US skincare lines (La Roche-Posay, CeraVe), virgin Brazilian hair bundles, HD lace wigs and professional salon cosmetics.",
    logo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.8,
    rating_count: 51,
    products: [
      { name: "CeraVe Hydrating Facial Cleanser 473ml", price: 22.00, category: "Beauty, Cosmetics & Hair", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80", desc: "Dermatologist recommended daily cleanser with ceramides." },
      { name: "Virgin Human Hair HD Lace Front Wig (24 Inches)", price: 180.00, category: "Beauty, Cosmetics & Hair", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80", desc: "100% natural virgin hair with invisible pre-plucked hairline." },
      { name: "Dior Sauvage Eau de Parfum (100ml Original)", price: 135.00, category: "Beauty, Cosmetics & Hair", image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80", desc: "Iconic men fragrance with noble bergamot and cedarwood notes." },
    ],
  },
  {
    name: "Ndokoti Auto & Moto Spare Parts",
    slug: "ndokoti-autoparts-douala",
    business_category: "Auto & Motorbike Parts",
    city: "Douala",
    quarter: "Ndokoti",
    landmark: "Carrefour Ndokoti, Beside Shell Station",
    address: "Carrefour Ndokoti, Douala",
    latitude: 4.0489,
    longitude: 9.7421,
    gps_coordinates: "4.0489, 9.7421",
    phone: "+237 670 114 455",
    whatsapp: "+237 670 114 455",
    email: "parts@ndokotiauto.cm",
    description: "The biggest automotive and motorcycle parts depot in Douala. Toyota, Mercedes, Nissan, Peugeot, Haojue & Senke genuine components, shock absorbers, batteries and oils.",
    logo: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.7,
    rating_count: 31,
    products: [
      { name: "TotalEnergies Quartz 9000 5W-40 Synthetic Engine Oil (5L)", price: 32.00, category: "Auto & Motorbike Parts", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80", desc: "Top tier engine protection for petrol and turbo diesel motors." },
      { name: "Varta Heavy Duty Car Battery 75Ah 12V", price: 95.00, category: "Auto & Motorbike Parts", image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80", desc: "German engineered maintenance-free high cranking power battery." },
      { name: "Toyota RAV4 / Corolla Front Ceramic Brake Pads", price: 28.00, category: "Auto & Motorbike Parts", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80", desc: "Dust-free ceramic brake pads with superior stopping power." },
    ],
  },
  {
    name: "Bafoussam Fresh Agro Market",
    slug: "bafoussam-fresh-agro-market",
    business_category: "African Raw Foods & Spices",
    city: "Bafoussam",
    quarter: "Marché A (Central)",
    landmark: "Marché A, Stand Vivres Frais",
    address: "Centre Commercial Marché A, Bafoussam",
    latitude: 5.4778,
    longitude: 10.4176,
    gps_coordinates: "5.4778, 10.4176",
    phone: "+237 676 889 900",
    whatsapp: "+237 676 889 900",
    email: "sales@bafoussamagro.cm",
    description: "Direct farm-to-table western highlands fresh produce. Irish potatoes, fresh tomatoes, green beans, avocados, dried beans, corn flour and authentic local honey.",
    logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.9,
    rating_count: 44,
    products: [
      { name: "Santa Irish Potatoes 50kg Bag", price: 35.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80", desc: "Freshly harvested clean organic yellow potatoes from West Region." },
      { name: "Pure Oku White Mountain Honey (1 Liter Bottle)", price: 18.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80", desc: "PGI certified medicinal raw honey from Mt Oku forest reserve." },
      { name: "Highland Fresh Butter Avocado Basket (Pack of 15)", price: 8.00, category: "African Raw Foods & Spices", image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80", desc: "Rich creamy giant avocados ready to eat." },
    ],
  },
  {
    name: "Limbe Seaside Fresh Seafoods",
    slug: "limbe-fresh-seafoods-downbeach",
    business_category: "Food & Groceries",
    city: "Limbe",
    quarter: "Down Beach",
    landmark: "Down Beach Fish Market, Beside Marine Base",
    address: "Down Beach Road, Limbe",
    latitude: 4.0167,
    longitude: 9.2167,
    gps_coordinates: "4.0167, 9.2167",
    phone: "+237 673 221 199",
    whatsapp: "+237 673 221 199",
    email: "fish@limbeseafoods.cm",
    description: "Daily ocean-fresh catches straight from the Atlantic ocean. Giant prawns, captain fish, barracuda, red snapper, crabs and cleaned frozen sea delicacies.",
    logo: "https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.9,
    rating_count: 57,
    products: [
      { name: "Fresh Atlantic Jumbo Prawns (1kg Box)", price: 25.00, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80", desc: "Cleaned and iced wild-caught jumbo prawns for grilling." },
      { name: "Whole Fresh Red Snapper Fish (2.5kg Avg)", price: 20.00, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80", desc: "Super fresh ocean fish perfect for famous Limbe braised fish." },
      { name: "Smoked Atlantic Sea Shrimps (1kg Pack)", price: 16.00, category: "Food & Groceries", image: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=600&q=80", desc: "Aromatic dried shrimps for flavoring vegetable soups." },
    ],
  },
  {
    name: "Bonanjo Home Decor & Furniture",
    slug: "bonanjo-furniture-douala",
    business_category: "Home Appliances & Furniture",
    city: "Douala",
    quarter: "Bonanjo",
    landmark: "Rue de l'Hôpital, Near Douala Port Office",
    address: "Rue de l'Hôpital, Bonanjo, Douala",
    latitude: 4.0435,
    longitude: 9.6895,
    gps_coordinates: "4.0435, 9.6895",
    phone: "+237 691 778 899",
    whatsapp: "+237 691 778 899",
    email: "contact@bonanjohome.cm",
    description: "Modern furniture, Italian leather sofa sets, mahogany dining tables, orthopedic mattresses, kitchen cabinets and luxury office desks.",
    logo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.8,
    rating_count: 29,
    products: [
      { name: "Modern 6-Seater Scandinavian Dining Set", price: 380.00, category: "Home Appliances & Furniture", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80", desc: "Solid hardwood table with padded velvet chairs." },
      { name: "Orthopedic High Density Queen Mattress (160x200cm)", price: 210.00, category: "Home Appliances & Furniture", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=80", desc: "Spinal support memory foam with anti-dust mite cover." },
      { name: "LG Inverter 4-Burner Gas Cooker + Electric Oven", price: 290.00, category: "Home Appliances & Furniture", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80", desc: "Stainless steel freestanding cooker with auto-ignition." },
    ],
  },
  {
    name: "Omnisports Health & Pharma Care",
    slug: "omnisports-health-pharma-yaounde",
    business_category: "Health & Pharmacy",
    city: "Yaoundé",
    quarter: "Omnisports",
    landmark: "Face Stade Omnisports Ahmadou Ahidjo",
    address: "Avenue Omnisports, Yaoundé",
    latitude: 3.8814,
    longitude: 11.5369,
    gps_coordinates: "3.8814, 11.5369",
    phone: "+237 678 332 211",
    whatsapp: "+237 678 332 211",
    email: "care@omnisportspharma.cm",
    description: "Certified parapharmacy and wellness store. Multivitamins, blood pressure monitors, glucose meters, baby nutrition (Guigoz, Nidal), maternity care and sports nutrition.",
    logo: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.9,
    rating_count: 38,
    products: [
      { name: "Omron Automatic Digital Blood Pressure Monitor M2", price: 48.00, category: "Health & Pharmacy", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80", desc: "Clinically validated upper arm BP monitor with memory storage." },
      { name: "Optimum Nutrition 100% Whey Gold Standard (2kg)", price: 65.00, category: "Health & Pharmacy", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=600&q=80", desc: "Premium protein powder for muscle recovery and stamina." },
      { name: "Vitabiotics Wellman / Wellwoman Plus Multivitamins", price: 19.50, category: "Health & Pharmacy", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80", desc: "Comprehensive micronutrients and omega-3 for daily vitality." },
    ],
  },
  {
    name: "Highland Books & Stationery",
    slug: "highland-books-bamenda-upstation",
    business_category: "Books, Stationery & Office",
    city: "Bamenda",
    quarter: "Up Station",
    landmark: "Near Governor's Office Junction, Up Station",
    address: "Up Station Road, Bamenda",
    latitude: 5.9450,
    longitude: 10.1650,
    gps_coordinates: "5.9450, 10.1650",
    phone: "+237 675 441 122",
    whatsapp: "+237 675 441 122",
    email: "info@highlandbooks.cm",
    description: "Official Cameroon GCE & BAC textbook supplier, A4 Double A printing paper boxes, scientific calculators, architect drawing tools and office stationery.",
    logo: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 4.7,
    rating_count: 22,
    products: [
      { name: "Double A Premium A4 Printing Paper (Box of 5 Reams)", price: 28.00, category: "Books, Stationery & Office", image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80", desc: "80gsm high brightness paper for jam-free high speed copying." },
      { name: "Casio FX-991EX ClassWiz Scientific Calculator (Original)", price: 25.00, category: "Books, Stationery & Office", image: "https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80", desc: "Standard approved scientific calculator for GCE O/A Levels." },
      { name: "Executive Leather Bound Notebook & Pen Gift Set", price: 15.00, category: "Books, Stationery & Office", image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", desc: "Hardcover lined journal with smooth rollerball pen." },
    ],
  },
  {
    name: "Sawa Artisan & Cultural Crafts",
    slug: "sawa-artisan-crafts-deido",
    business_category: "Traditional Arts & Crafts",
    city: "Douala",
    quarter: "Deido",
    landmark: "Rue de la Joie, Near Rond-Point Deido",
    address: "Rue de la Joie, Deido, Douala",
    latitude: 4.0621,
    longitude: 9.7123,
    gps_coordinates: "4.0621, 9.7123",
    phone: "+237 696 554 433",
    whatsapp: "+237 696 554 433",
    email: "art@sawacrafts.cm",
    description: "Authentic Cameroon cultural treasures: Hand-carved Sawa wooden pirogues, Bamileke royal beaded stools, Fang masks, bronze sculptures and Ngondo commemorative crafts.",
    logo: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80",
    banner: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    rating_avg: 5.0,
    rating_count: 36,
    products: [
      { name: "Bamileke Hand-Beaded Royal Stool (40cm)", price: 120.00, category: "Traditional Arts & Crafts", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80", desc: "Handcrafted wooden stool enveloped with thousands of glass beads." },
      { name: "Carved Ebony Wood Sawa Fishermen Pirogue", price: 45.00, category: "Traditional Arts & Crafts", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80", desc: "Detailed decorative maritime boat sculpture representing the Sawa people." },
      { name: "Cameroon Grassfields Ceremonial Mask", price: 75.00, category: "Traditional Arts & Crafts", image: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80", desc: "Authentic wall hanging African cultural hardwood mask." },
    ],
  },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });

  try {
    console.log("Connected to MySQL database.");

    // 1. Ensure columns in stores table
    const [cols] = await conn.execute("DESCRIBE stores");
    const existingCols = new Set(cols.map((c) => c.Field));

    if (!existingCols.has("quarter")) {
      await conn.execute("ALTER TABLE stores ADD COLUMN quarter VARCHAR(120) NULL");
      console.log("Added quarter column to stores");
    }
    if (!existingCols.has("landmark")) {
      await conn.execute("ALTER TABLE stores ADD COLUMN landmark VARCHAR(190) NULL");
      console.log("Added landmark column to stores");
    }
    if (!existingCols.has("latitude")) {
      await conn.execute("ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,8) NULL");
      console.log("Added latitude column to stores");
    }
    if (!existingCols.has("longitude")) {
      await conn.execute("ALTER TABLE stores ADD COLUMN longitude DECIMAL(11,8) NULL");
      console.log("Added longitude column to stores");
    }
    if (!existingCols.has("gps_coordinates")) {
      await conn.execute("ALTER TABLE stores ADD COLUMN gps_coordinates VARCHAR(100) NULL");
      console.log("Added gps_coordinates column to stores");
    }

    // 2. Seed / Update Categories
    for (const cat of CAMEROON_CATEGORIES) {
      await conn.execute(
        `INSERT INTO categories (name, slug, icon, description, color, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           icon = VALUES(icon),
           description = VALUES(description),
           color = VALUES(color),
           sort_order = VALUES(sort_order),
           is_active = 1`,
        [cat.name, cat.slug, cat.icon, cat.description, cat.color, cat.sort_order]
      );
    }
    console.log(`Seeded ${CAMEROON_CATEGORIES.length} Cameroon market categories.`);

    // 3. Seed / Update Stores
    for (const s of DUMMY_STORES) {
      // Check if store with slug exists
      const [existing] = await conn.execute("SELECT id FROM stores WHERE slug = ? LIMIT 1", [s.slug]);
      let storeId;

      if (existing.length > 0) {
        storeId = existing[0].id;
        await conn.execute(
          `UPDATE stores SET
             name = ?, business_category = ?, city = ?, quarter = ?, landmark = ?,
             address = ?, latitude = ?, longitude = ?, gps_coordinates = ?,
             phone = ?, whatsapp = ?, email = ?, description = ?, logo = ?, banner = ?,
             rating_avg = ?, rating_count = ?, verification_status = 'verified', store_status = 'active'
           WHERE id = ?`,
          [
            s.name, s.business_category, s.city, s.quarter, s.landmark,
            s.address, s.latitude, s.longitude, s.gps_coordinates,
            s.phone, s.whatsapp, s.email, s.description, s.logo, s.banner,
            s.rating_avg, s.rating_count, storeId,
          ]
        );
        console.log(`Updated store: ${s.name} (ID: ${storeId})`);
      } else {
        const [res] = await conn.execute(
          `INSERT INTO stores (
             name, slug, business_category, city, quarter, landmark,
             address, country, latitude, longitude, gps_coordinates,
             phone, whatsapp, email, description, logo, banner,
             rating_avg, rating_count, verification_status, store_status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Cameroon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'active')`,
          [
            s.name, s.slug, s.business_category, s.city, s.quarter, s.landmark,
            s.address, s.latitude, s.longitude, s.gps_coordinates,
            s.phone, s.whatsapp, s.email, s.description, s.logo, s.banner,
            s.rating_avg, s.rating_count,
          ]
        );
        storeId = res.insertId;
        console.log(`Created store: ${s.name} (ID: ${storeId})`);

        // Initialize wallet
        await conn.execute(
          "INSERT INTO wallets (store_id, available_balance) VALUES (?, 0.00) ON DUPLICATE KEY UPDATE store_id=store_id",
          [storeId]
        );
      }

      // 4. Seed Products for Store
      for (const p of s.products) {
        const [existingProd] = await conn.execute(
          "SELECT id FROM products WHERE store_id = ? AND name = ? LIMIT 1",
          [storeId, p.name]
        );

        if (existingProd.length === 0) {
          await conn.execute(
            `INSERT INTO products (
               store_id, name, price, description, category, image,
               status, marketplace_enabled, stock_packages, package_name, unit_type, unit_value, transport_fee
             ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 50, 'unit', 'pcs', 1.000, 0.00)`,
            [storeId, p.name, p.price, p.desc, p.category, p.image]
          );
        }
      }
    }

    console.log("Successfully seeded 15 Cameroon dummy stores with products & GPS locations!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await conn.end();
  }
}

seed();
