"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PayPalButton } from "@/components/paypal-button";
import { DeliveryMethodSelector } from "@/components/delivery/delivery-method-selector";
import { useCart } from "@/context/cart-context";
import { formatCurrency, formatPrice } from "@/lib/utils";
import { AlertCircle, CheckCircle, CreditCard, Smartphone } from "lucide-react";
import type { CustomerDeliveryDetails } from "@/types/delivery";

type CheckoutForm = {
  customerName: string;
  customerEmail: string;
  phoneCountryCode: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  deliveryNote: string;
  country: string;
};

type FormField = keyof CheckoutForm;

type StockValidationEntry = {
  productId: number;
  name: string;
  requested: number;
  available: number;
};

function formatQty(quantityPackages: number, packageName: string, unitType: "pcs" | "kg", unitValue: number) {
  const totalUnits = Number(quantityPackages) * Number(unitValue);
  return `${quantityPackages} ${packageName}${quantityPackages > 1 ? "s" : ""} (${totalUnits} ${unitType} total)`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

function validateCountryCode(code: string): boolean {
  return /^\+\d{1,4}$/.test(code.trim());
}

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { items, subtotal, clearCart, currency, setCurrency } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<StockValidationEntry[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const router = useRouter();

  // Delivery State
  const [deliveryDetails, setDeliveryDetails] = useState<CustomerDeliveryDetails | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "fapshi">("paypal");
  const [fapshiLoading, setFapshiLoading] = useState(false);
  const [fapshiError, setFapshiError] = useState<string | null>(null);

  const handleDeliveryChange = (details: CustomerDeliveryDetails, fee: number) => {
    setDeliveryDetails(details);
    setDeliveryFee(fee);
  };

  // Determine primary store ID from cart items (use first item's storeId or default 1)
  const primaryStoreId = items[0]?.storeId ?? 1;

  const transportTotal = items.reduce(
    (sum, item) => sum + item.transportFee * item.quantityPackages,
    0,
  );
  const grandTotal = subtotal + transportTotal + deliveryFee;

  const stockBlocked = stockIssues.length > 0;

  const stockBlockedMessage = useMemo(() => {
    if (!stockBlocked) {
      return "";
    }

    const details = stockIssues
      .map((issue) => `${issue.name}: requested ${issue.requested}, available ${issue.available}`)
      .join(" | ");

    return `Some items are out of stock. ${details}`;
  }, [stockBlocked, stockIssues]);

  const [form, setForm] = useState<CheckoutForm>({
    customerName: session?.user?.name ?? "",
    customerEmail: session?.user?.email ?? "",
    phoneCountryCode: "+237",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    deliveryNote: "",
    country: "",
  });

  const [touched, setTouched] = useState<Record<FormField, boolean>>({
    customerName: false,
    customerEmail: false,
    phoneCountryCode: false,
    phone: false,
    addressLine1: false,
    addressLine2: false,
    city: false,
    stateProvince: false,
    postalCode: false,
    deliveryNote: false,
    country: false,
  });
  const [profilePrefillDone, setProfilePrefillDone] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || session?.user?.name || "",
      customerEmail: prev.customerEmail || session?.user?.email || "",
    }));
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (!session?.user || profilePrefillDone) {
      return;
    }

    let active = true;

    async function loadProfilePrefill() {
      try {
        const response = await fetch("/api/user/profile", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | {
              profile?: {
                phoneCountryCode?: string;
                phoneNumber?: string;
                country?: string;
                addressLine1?: string;
                addressLine2?: string;
                city?: string;
                stateProvince?: string;
                postalCode?: string;
                deliveryNote?: string;
              };
            }
          | null;

        if (!active || !payload?.profile) {
          return;
        }

        const profile = payload.profile;

        setForm((prev) => ({
          ...prev,
          phoneCountryCode:
            prev.phoneCountryCode.trim() && prev.phoneCountryCode !== "+237"
              ? prev.phoneCountryCode
              : (profile.phoneCountryCode?.trim() || prev.phoneCountryCode),
          phone: prev.phone.trim() ? prev.phone : (profile.phoneNumber?.trim() || prev.phone),
          country: prev.country.trim() ? prev.country : (profile.country?.trim() || prev.country),
          addressLine1:
            prev.addressLine1.trim() ? prev.addressLine1 : (profile.addressLine1?.trim() || prev.addressLine1),
          addressLine2:
            prev.addressLine2.trim() ? prev.addressLine2 : (profile.addressLine2?.trim() || prev.addressLine2),
          city: prev.city.trim() ? prev.city : (profile.city?.trim() || prev.city),
          stateProvince:
            prev.stateProvince.trim() ? prev.stateProvince : (profile.stateProvince?.trim() || prev.stateProvince),
          postalCode:
            prev.postalCode.trim() ? prev.postalCode : (profile.postalCode?.trim() || prev.postalCode),
          deliveryNote:
            prev.deliveryNote.trim() ? prev.deliveryNote : (profile.deliveryNote?.trim() || prev.deliveryNote),
        }));
      } catch {
        // Keep checkout functional even when profile prefill is unavailable.
      } finally {
        if (active) {
          setProfilePrefillDone(true);
        }
      }
    }

    void loadProfilePrefill();

    return () => {
      active = false;
    };
  }, [profilePrefillDone, session?.user]);

  useEffect(() => {
    let active = true;

    async function validateStock() {
      if (items.length === 0) {
        setStockIssues([]);
        return;
      }

      setCheckingStock(true);
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { products?: Array<{ id: number; stockPackages?: number }> }
          | null;

        if (!active) {
          return;
        }

        const availableById = new Map<number, number>();
        for (const product of payload?.products ?? []) {
          if (typeof product.id === "number" && typeof product.stockPackages === "number") {
            availableById.set(product.id, product.stockPackages);
          }
        }

        const nextIssues: StockValidationEntry[] = [];
        for (const item of items) {
          const available = availableById.get(item.productId);
          if (typeof available === "number" && item.quantityPackages > available) {
            nextIssues.push({
              productId: item.productId,
              name: item.name,
              requested: item.quantityPackages,
              available,
            });
          }
        }

        setStockIssues(nextIssues);
      } catch {
        setStockIssues([]);
      } finally {
        if (active) {
          setCheckingStock(false);
        }
      }
    }

    void validateStock();

    return () => {
      active = false;
    };
  }, [items]);

  const deliveryCode = deliveryDetails?.delivery_code || "local_delivery";

  const fieldErrors: Record<FormField, string> = useMemo(() => {
    const isPickupOrDigital = deliveryCode === "store_pickup" || deliveryCode === "digital_delivery";
    const isLocal = deliveryCode === "local_delivery";

    return {
      customerName: form.customerName.trim() ? "" : "Full name is required",
      customerEmail: !form.customerEmail.trim()
        ? "Email address is required"
        : validateEmail(form.customerEmail)
          ? ""
          : "Enter a valid email address",
      phoneCountryCode: !form.phoneCountryCode.trim()
        ? "Country code is required"
        : validateCountryCode(form.phoneCountryCode)
          ? ""
          : "Use format like +237",
      phone: !form.phone.trim()
        ? "Phone number is required"
        : validatePhoneNumber(form.phone)
          ? ""
          : "Enter a valid phone number",
      addressLine1: isPickupOrDigital
        ? ""
        : !form.addressLine1.trim()
          ? "Address/Quarter is required"
          : form.addressLine1.trim().length >= 3
            ? ""
            : "Address/Quarter must be at least 3 characters",
      addressLine2: "",
      city: isPickupOrDigital ? "" : form.city.trim() ? "" : "City is required",
      stateProvince: isPickupOrDigital || isLocal ? "" : form.stateProvince.trim() ? "" : "State/Province/Region is required",
      postalCode: isPickupOrDigital || isLocal ? "" : form.postalCode.trim() ? "" : "Postal code is required",
      deliveryNote: "",
      country: isPickupOrDigital || isLocal ? "" : form.country.trim() ? "" : "Country is required",
    };
  }, [form, deliveryCode]);

  const handlePaymentSuccess = (orderId: string) => {
    clearCart();
    router.push(`/checkout/success?orderId=${orderId}`);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  // Generate a stable master order ID for Fapshi session linking
  const masterOrderId = useMemo(() => {
    // Use a client-side random reference; server will validate via fapshi_checkout_sessions
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("fapshi_master_order_id");
      if (stored) return stored;
      const id = `BF-FAPSHI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      sessionStorage.setItem("fapshi_master_order_id", id);
      return id;
    }
    return `BF-FAPSHI-${Date.now()}`;
  }, []);

  const handleFapshiPay = async () => {
    if (!isFormValid || stockBlocked) return;
    setFapshiLoading(true);
    setFapshiError(null);
    try {
      const res = await fetch("/api/payments/fapshi/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterOrderId,
          customerEmail: form.customerEmail,
          cartItems: items.map((item) => ({
            productId: item.productId,
            quantityPackages: item.quantityPackages,
            unitPrice: item.price,
            unitTransportFee: item.transportFee,
            packageName: item.packageName,
            unitType: item.unitType,
            unitValue: item.unitValue,
            storeId: item.storeId,
          })),
          deliveryFee,
          deliveryMethodId: deliveryDetails?.delivery_method_id || null,
          deliveryDataJson: deliveryDetails ? JSON.stringify(deliveryDetails) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.link) {
        setFapshiError(data.error || "Failed to initiate Mobile Money payment.");
        return;
      }

      // Redirect to Fapshi payment page
      window.location.href = data.link;
    } catch {
      setFapshiError("Network error. Please check your connection and try again.");
    } finally {
      setFapshiLoading(false);
    }
  };

  const isFormValid = Object.values(fieldErrors).every((value) => !value);
  const hasValidationErrors = Object.values(touched).some(Boolean) && !isFormValid;
  const fieldLabels: Record<FormField, string> = {
    customerName: "Full Name",
    customerEmail: "Email Address",
    phoneCountryCode: "Phone Country Code",
    phone: "Phone Number",
    addressLine1: "Address Line 1",
    addressLine2: "Address Line 2",
    city: "City / Town",
    stateProvince: "State / Province / Region",
    postalCode: "Postal / ZIP Code",
    deliveryNote: "Delivery Note",
    country: "Country",
  };
  const fieldInputIds: Record<FormField, string> = {
    customerName: "customerName",
    customerEmail: "customerEmail",
    phoneCountryCode: "phoneCountryCode",
    phone: "phone",
    addressLine1: "addressLine1",
    addressLine2: "addressLine2",
    city: "city",
    stateProvince: "stateProvince",
    postalCode: "postalCode",
    deliveryNote: "deliveryNote",
    country: "country",
  };
  const validationIssues = (Object.entries(fieldErrors) as Array<[FormField, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([field, message]) => ({
      field,
      label: fieldLabels[field],
      message,
    }));

  const focusField = (field: FormField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const element = document.getElementById(fieldInputIds[field]);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in element && typeof element.focus === "function") {
      element.focus();
    }
  };

  const inputClass = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-surface px-4 py-3 text-sm transition-colors focus:outline-none ${
      hasError
        ? "border-red-400 focus:border-red-500"
        : "border-border/50 focus:border-brand"
    }`;

  const countryOptions = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo",
    "Costa Rica",
    "Cote d'Ivoire",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Democratic Republic of the Congo",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe",
  ];

  const dialingCodeOptions = [
    "+237",
    "+234",
    "+233",
    "+1",
    "+44",
    "+49",
    "+33",
  ];

  const phoneForOrder = `${form.phoneCountryCode} ${form.phone.trim()}`.trim();
  const shippingAddressForOrder = [
    form.addressLine1.trim(),
    form.addressLine2.trim(),
    form.city.trim(),
    form.stateProvince.trim(),
    form.postalCode.trim(),
    form.deliveryNote.trim() ? `Note: ${form.deliveryNote.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (!session?.user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="container-shell py-16">
          <div className="rounded-2xl border border-border/50 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-foreground/80">Please sign in to checkout.</p>
            <Link href="/signin" className="mt-4 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-deep transition-colors">
              Sign In
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="container-shell py-16">
          <div className="rounded-2xl border border-border/50 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-foreground/80">Your cart is empty.</p>
            <Link href="/products" className="mt-4 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-deep transition-colors">
              Continue Shopping
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-transparent">
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="mb-8">
          <h1 className="section-title text-brand-deep">Checkout</h1>
          <p className="mt-2 text-foreground/60">Complete your order securely with PayPal</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" />
            Standard Secure Checkout
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Checkout Form */}
          <section className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm">
            {/* Delivery Method Selector First */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-brand-deep mb-4">Delivery Method</h2>
              <DeliveryMethodSelector
                storeId={primaryStoreId}
                cartSubtotal={subtotal}
                onChange={handleDeliveryChange}
              />
            </div>

            {/* Address & Contact Information */}
            <div className="border-t border-border/30 pt-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-brand-deep">
                  {deliveryCode === "store_pickup"
                    ? "Pickup Contact Info"
                    : deliveryCode === "digital_delivery"
                      ? "Recipient Information"
                      : "Delivery Address"}
                </h2>
                <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-foreground/70">
                  Required fields *
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="customerName" className="text-sm font-semibold text-foreground/70">
                    Full Name *
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={form.customerName}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, customerName: e.target.value }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, customerName: true }))}
                    aria-invalid={Boolean(touched.customerName && fieldErrors.customerName)}
                    className={inputClass(Boolean(touched.customerName && fieldErrors.customerName))}
                  />
                  {touched.customerName && fieldErrors.customerName && (
                    <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.customerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerEmail" className="text-sm font-semibold text-foreground/70">
                    Email Address *
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={form.customerEmail}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, customerEmail: e.target.value }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, customerEmail: true }))}
                    aria-invalid={Boolean(touched.customerEmail && fieldErrors.customerEmail)}
                    className={inputClass(Boolean(touched.customerEmail && fieldErrors.customerEmail))}
                  />
                  {touched.customerEmail && fieldErrors.customerEmail && (
                    <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.customerEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-semibold text-foreground/70">
                    Phone Number *
                  </label>
                  <div className="mt-1 grid grid-cols-[120px_1fr] gap-2">
                    <input
                      id="phoneCountryCode"
                      type="text"
                      inputMode="tel"
                      list="dialing-code-options"
                      placeholder="+237"
                      value={form.phoneCountryCode}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, phoneCountryCode: e.target.value }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, phoneCountryCode: true }))}
                      aria-invalid={Boolean(touched.phoneCountryCode && fieldErrors.phoneCountryCode)}
                      className={inputClass(Boolean(touched.phoneCountryCode && fieldErrors.phoneCountryCode))}
                    />
                    <datalist id="dialing-code-options">
                      {dialingCodeOptions.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </datalist>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel-national"
                      inputMode="tel"
                      placeholder="e.g. 677123456"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, phone: e.target.value }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                      aria-invalid={Boolean(touched.phone && fieldErrors.phone)}
                      className={inputClass(Boolean(touched.phone && fieldErrors.phone))}
                    />
                  </div>
                  {(touched.phoneCountryCode && fieldErrors.phoneCountryCode) || (touched.phone && fieldErrors.phone) ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {fieldErrors.phoneCountryCode || fieldErrors.phone}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-foreground/55">Example: {form.phoneCountryCode} 677123456</p>
                  )}
                </div>

                {/* Show address fields only if not store pickup or digital delivery */}
                {deliveryCode !== "store_pickup" && deliveryCode !== "digital_delivery" && (
                  <>
                    {deliveryCode === "shipping" && (
                      <div>
                        <label htmlFor="country" className="text-sm font-semibold text-foreground/70">
                          Country *
                        </label>
                        <select
                          id="country"
                          autoComplete="country-name"
                          value={form.country}
                          onChange={(e) =>
                            setForm((v) => ({ ...v, country: e.target.value }))
                          }
                          onBlur={() => setTouched((prev) => ({ ...prev, country: true }))}
                          aria-invalid={Boolean(touched.country && fieldErrors.country)}
                          className={inputClass(Boolean(touched.country && fieldErrors.country))}
                        >
                          <option value="">Select country</option>
                          {countryOptions.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                        {touched.country && fieldErrors.country && (
                          <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.country}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="city" className="text-sm font-semibold text-foreground/70">
                        City / Town *
                      </label>
                      <input
                        id="city"
                        autoComplete="address-level2"
                        placeholder="e.g. Douala, Yaoundé"
                        value={form.city}
                        onChange={(e) =>
                          setForm((v) => ({ ...v, city: e.target.value }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
                        aria-invalid={Boolean(touched.city && fieldErrors.city)}
                        className={inputClass(Boolean(touched.city && fieldErrors.city))}
                      />
                      {touched.city && fieldErrors.city && (
                        <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.city}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="addressLine1" className="text-sm font-semibold text-foreground/70">
                        {deliveryCode === "local_delivery" ? "Quarter / Street Address *" : "Address Line 1 *"}
                      </label>
                      <input
                        id="addressLine1"
                        autoComplete="address-line1"
                        placeholder={deliveryCode === "local_delivery" ? "e.g. Akwa, Bonapriso, or street address" : "House number and street"}
                        value={form.addressLine1}
                        onChange={(e) =>
                          setForm((v) => ({ ...v, addressLine1: e.target.value }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, addressLine1: true }))}
                        aria-invalid={Boolean(touched.addressLine1 && fieldErrors.addressLine1)}
                        className={inputClass(Boolean(touched.addressLine1 && fieldErrors.addressLine1))}
                      />
                      {touched.addressLine1 && fieldErrors.addressLine1 && (
                        <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.addressLine1}</p>
                      )}
                    </div>

                    {deliveryCode === "shipping" && (
                      <>
                        <div className="md:col-span-2">
                          <label htmlFor="addressLine2" className="text-sm font-semibold text-foreground/70">
                            Address Line 2 <span className="text-foreground/50">(optional)</span>
                          </label>
                          <input
                            id="addressLine2"
                            autoComplete="address-line2"
                            placeholder="Apartment, suite, unit, building"
                            value={form.addressLine2}
                            onChange={(e) =>
                              setForm((v) => ({ ...v, addressLine2: e.target.value }))
                            }
                            className={inputClass(false)}
                          />
                        </div>

                        <div>
                          <label htmlFor="stateProvince" className="text-sm font-semibold text-foreground/70">
                            State / Province / Region *
                          </label>
                          <input
                            id="stateProvince"
                            autoComplete="address-level1"
                            placeholder="State, province, or region"
                            value={form.stateProvince}
                            onChange={(e) =>
                              setForm((v) => ({ ...v, stateProvince: e.target.value }))
                            }
                            onBlur={() => setTouched((prev) => ({ ...prev, stateProvince: true }))}
                            aria-invalid={Boolean(touched.stateProvince && fieldErrors.stateProvince)}
                            className={inputClass(Boolean(touched.stateProvince && fieldErrors.stateProvince))}
                          />
                          {touched.stateProvince && fieldErrors.stateProvince && (
                            <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.stateProvince}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="postalCode" className="text-sm font-semibold text-foreground/70">
                            Postal / ZIP Code *
                          </label>
                          <input
                            id="postalCode"
                            autoComplete="postal-code"
                            placeholder="Postal or ZIP code"
                            value={form.postalCode}
                            onChange={(e) =>
                              setForm((v) => ({ ...v, postalCode: e.target.value }))
                            }
                            onBlur={() => setTouched((prev) => ({ ...prev, postalCode: true }))}
                            aria-invalid={Boolean(touched.postalCode && fieldErrors.postalCode)}
                            className={inputClass(Boolean(touched.postalCode && fieldErrors.postalCode))}
                          />
                          {touched.postalCode && fieldErrors.postalCode && (
                            <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.postalCode}</p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <label htmlFor="deliveryNote" className="text-sm font-semibold text-foreground/70">
                        Delivery Note / Landmark <span className="text-foreground/50">(optional)</span>
                      </label>
                      <textarea
                        id="deliveryNote"
                        placeholder="Landmark, gate code, or delivery instructions"
                        value={form.deliveryNote}
                        onChange={(e) =>
                          setForm((v) => ({ ...v, deliveryNote: e.target.value }))
                        }
                        className={`${inputClass(false)} min-h-20 resize-none`}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {hasValidationErrors && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" aria-live="polite">
                <p className="font-semibold">Please fix the following before payment:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validationIssues.map((issue) => (
                    <button
                      key={issue.field}
                      type="button"
                      onClick={() => focusField(issue.field)}
                      className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                    >
                      {issue.label}: {issue.message}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Section */}
            <div className="mt-8 border-t border-border/30 pt-8">
              <h3 className="text-lg font-bold text-brand-deep mb-4">Payment Method</h3>

              {/* Payment Method Tabs */}
              <div className="flex gap-2 mb-6 p-1 bg-surface-soft rounded-xl">
                <button
                  type="button"
                  id="payment-tab-paypal"
                  onClick={() => {
                    setPaymentMethod("paypal");
                    setCurrency("USD");
                    setError(null);
                    setFapshiError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    paymentMethod === "paypal"
                      ? "bg-white shadow-sm text-brand-deep border border-border/40"
                      : "text-foreground/60 hover:text-foreground/80"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  PayPal ($)
                </button>
                <button
                  type="button"
                  id="payment-tab-fapshi"
                  onClick={() => {
                    setPaymentMethod("fapshi");
                    setCurrency("XAF");
                    setError(null);
                    setFapshiError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    paymentMethod === "fapshi"
                      ? "bg-white shadow-sm text-brand-deep border border-border/40"
                      : "text-foreground/60 hover:text-foreground/80"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile Money (CFA)
                </button>
              </div>

              {(error || fapshiError) && (
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-100 p-4 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error || fapshiError}</p>
                </div>
              )}

              {stockBlocked && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Stock update required before payment</p>
                    <p className="mt-1">{stockBlockedMessage}</p>
                    <p className="mt-1">Please reduce quantities in cart or wait for restock.</p>
                  </div>
                </div>
              )}

              {checkingStock && (
                <div className="mb-4 rounded-lg border border-border/40 bg-surface/40 p-3 text-xs text-foreground/60">
                  Checking latest stock availability...
                </div>
              )}

              {!isFormValid ? (
                <div className="rounded-lg bg-amber-100/50 border border-amber-200 p-4 text-sm text-amber-700">
                  <p className="font-semibold">Payment is locked until these are fixed:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {validationIssues.map((issue) => (
                      <button
                        key={`payment-${issue.field}`}
                        type="button"
                        onClick={() => focusField(issue.field)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                      >
                        {issue.label}: {issue.message}
                      </button>
                    ))}
                  </div>
                </div>
              ) : paymentMethod === "paypal" ? (
                !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
                  <div className="rounded-lg bg-red-100/50 border border-red-200 p-4 text-sm text-red-700">
                    PayPal is not configured. Please contact support.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-dashed border-border/50 bg-surface/30 p-6 min-h-24 flex items-center justify-center">
                      <PayPalButton
                        customerName={form.customerName}
                        customerEmail={form.customerEmail}
                        phone={phoneForOrder}
                        address={shippingAddressForOrder}
                        country={form.country}
                        total={grandTotal}
                        deliveryMethodId={deliveryDetails?.delivery_method_id}
                        deliveryFee={deliveryFee}
                        deliveryNotes={deliveryDetails?.deliveryInstructions}
                        deliveryDataJson={deliveryDetails ? JSON.stringify(deliveryDetails) : undefined}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={stockBlocked || checkingStock}
                        disabledReason={
                          checkingStock
                            ? "Checking stock availability. Please wait a moment."
                            : stockBlockedMessage
                        }
                      />
                    </div>
                    <p className="text-xs text-foreground/50 text-center">
                      Click the PayPal button above to complete your payment.
                    </p>
                  </div>
                )
              ) : (
                /* Fapshi Mobile Money */
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/40 bg-surface/40 p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground/80">Fapshi Mobile Money</p>
                        <p className="text-xs text-foreground/55 mt-0.5">
                          Pay securely with MTN MoMo, Orange Money, or other mobile wallets.
                          You will be redirected to the Fapshi payment page.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-md bg-orange-50 border border-orange-100 px-4 py-2 text-xs text-orange-700 mb-4">
                      Amount to pay: <span className="font-bold">{formatPrice(grandTotal, currency)}</span>
                      {currency === "USD" ? <span className="text-orange-500"> (converted to XAF at checkout)</span> : null}
                    </div>
                    <button
                      id="fapshi-pay-btn"
                      type="button"
                      onClick={handleFapshiPay}
                      disabled={fapshiLoading || stockBlocked || checkingStock}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {fapshiLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Redirecting to Mobile Money...
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-4 w-4" />
                          Pay with Mobile Money
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-foreground/50 text-center">
                    Powered by Fapshi. Supports MTN MoMo &amp; Orange Money.
                  </p>
                </div>
              )}

              <p className="mt-6 text-xs text-foreground/50 text-center">
                Payments are processed securely. Your data is protected.
              </p>
            </div>
          </section>

          {/* Order Summary Sidebar */}
          <aside className="h-fit rounded-2xl border border-border/50 bg-white p-6 shadow-sm sticky top-4">
            <h2 className="text-xl font-bold text-brand-deep mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4 pb-4 border-b border-border/30 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground/80 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-foreground/50">Qty: {formatQty(item.quantityPackages, item.packageName, item.unitType, item.unitValue)}</p>
                  </div>
                  <p className="font-semibold text-brand-deep flex-shrink-0">
                    {formatPrice(item.price * item.quantityPackages, currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-foreground/60">
                <span>Products subtotal:</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-foreground/60">
                <span>Transport fees:</span>
                <span>{formatPrice(transportTotal, currency)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-foreground/60">
                  <span>Delivery fee:</span>
                  <span>{formatPrice(deliveryFee, currency)}</span>
                </div>
              )}
              {deliveryFee === 0 && deliveryDetails && (
                <div className="flex justify-between text-green-600 text-xs font-semibold">
                  <span>Delivery fee:</span>
                  <span>Free 🎉</span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-brand/10 p-4 border border-brand/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50 mb-1">
                Total
              </p>
              <p className="text-3xl font-bold text-brand-deep">
                {formatPrice(grandTotal, currency)}
              </p>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-green-100/50 border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-semibold mb-1">Secure Payment</p>
                  <p className="text-xs">
                    Your payment information is encrypted and secure.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
