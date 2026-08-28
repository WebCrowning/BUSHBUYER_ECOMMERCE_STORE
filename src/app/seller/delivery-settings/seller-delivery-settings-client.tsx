"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/types/marketplace";
import type { StoreDeliveryMethod } from "@/types/delivery";
import { Truck, MapPin, Building, FileCode, CheckCircle, Save, Settings, Loader2 } from "lucide-react";

export default function SellerDeliverySettingsClient({ store }: { store: Store }) {
  const [methods, setMethods] = useState<StoreDeliveryMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingMethodId, setSavingMethodId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveryMethods();
  }, [store.id]);

  const fetchDeliveryMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/delivery`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch (err) {
      console.error("Error fetching delivery methods:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = (methodId: number, currentEnabled: boolean) => {
    setMethods((prev) =>
      prev.map((m) => (m.delivery_method_id === methodId ? { ...m, enabled: !currentEnabled } : m))
    );
  };

  const handleSetDefault = (methodId: number) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        is_default: m.delivery_method_id === methodId,
      }))
    );
  };

  const handleConfigChange = (methodId: number, key: string, value: any) => {
    setMethods((prev) =>
      prev.map((m) => {
        if (m.delivery_method_id === methodId) {
          return {
            ...m,
            configuration: {
              ...m.configuration,
              [key]: value,
            },
          };
        }
        return m;
      })
    );
  };

  const handleSaveMethod = async (method: StoreDeliveryMethod) => {
    setSavingMethodId(method.delivery_method_id);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/stores/${store.id}/delivery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_method_id: method.delivery_method_id,
          enabled: method.enabled,
          is_default: method.is_default,
          configuration: method.configuration,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`✓ Saved settings for ${method.name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error saving delivery method:", err);
    } finally {
      setSavingMethodId(null);
    }
  };

  const getMethodIcon = (code?: string) => {
    switch (code) {
      case "local_delivery":
        return <MapPin className="w-5 h-5 text-emerald-600" />;
      case "shipping":
        return <Truck className="w-5 h-5 text-sky-600" />;
      case "store_pickup":
        return <Building className="w-5 h-5 text-amber-600" />;
      case "digital_delivery":
        return <FileCode className="w-5 h-5 text-purple-600" />;
      default:
        return <Settings className="w-5 h-5 text-foreground/60" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-brand-deep">Store Delivery Settings</h1>
          </div>
          <p className="mt-1 text-xs text-foreground/60">
            Configure delivery options, fees & pickup instructions for <span className="font-bold text-foreground/80">{store.name}</span>
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-foreground/60 text-xs font-medium">Loading store delivery methods...</div>
      ) : (
        <div className="space-y-5">
          {methods.map((method, idx) => (
            <div
              key={method.delivery_method_id || method.code || `delivery-method-${idx}`}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-surface rounded-xl border border-border">
                    {getMethodIcon(method.code)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-brand-deep">{method.name}</h3>
                      {method.is_default && (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          Default Method
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60">{method.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={method.enabled}
                      onChange={() => handleToggleEnabled(method.delivery_method_id, method.enabled)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    Enable Method
                  </label>

                  {!method.is_default && method.enabled && (
                    <button
                      onClick={() => handleSetDefault(method.delivery_method_id)}
                      className="px-3 py-1.5 bg-surface hover:bg-surface-soft text-foreground/80 rounded-xl text-xs font-bold border border-border transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>

              {/* Configurations */}
              {method.enabled && (
                <div className="pt-2 space-y-4 text-xs">
                  {/* LOCAL DELIVERY CONFIG */}
                  {method.code === "local_delivery" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Local Cities (comma separated)</label>
                        <input
                          type="text"
                          value={
                            Array.isArray(method.configuration.cities)
                              ? method.configuration.cities.join(", ")
                              : method.configuration.cities || ""
                          }
                          onChange={(e) =>
                            handleConfigChange(
                              method.delivery_method_id,
                              "cities",
                              e.target.value.split(",").map((c: string) => c.trim())
                            )
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                          placeholder="Douala, Yaounde, Bamenda"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Delivery Fee (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={method.configuration.delivery_fee ?? 0}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "delivery_fee", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Free Delivery Threshold (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={method.configuration.free_delivery_threshold ?? 0}
                          onChange={(e) =>
                            handleConfigChange(
                              method.delivery_method_id,
                              "free_delivery_threshold",
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Estimated Delivery Time</label>
                        <input
                          type="text"
                          value={method.configuration.estimated_time || ""}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "estimated_time", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                          placeholder="24-48 Hours"
                        />
                      </div>
                    </div>
                  )}

                  {/* SHIPPING CONFIG */}
                  {method.code === "shipping" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Shipping Fee (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={method.configuration.shipping_fee ?? 0}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "shipping_fee", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Courier Name</label>
                        <input
                          type="text"
                          value={method.configuration.courier_name || ""}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "courier_name", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                          placeholder="Bushbuyer Express / DHL"
                        />
                      </div>
                    </div>
                  )}

                  {/* STORE PICKUP CONFIG */}
                  {method.code === "store_pickup" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Pickup Address</label>
                        <input
                          type="text"
                          value={method.configuration.pickup_address || ""}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "pickup_address", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                          placeholder="Commercial Avenue, Suite 102"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-foreground/60 mb-1">Business Hours</label>
                        <input
                          type="text"
                          value={method.configuration.business_hours || ""}
                          onChange={(e) =>
                            handleConfigChange(method.delivery_method_id, "business_hours", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-border bg-surface text-brand-deep rounded-xl outline-none focus:border-brand"
                          placeholder="Mon-Sat: 8:00 AM - 6:00 PM"
                        />
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleSaveMethod(method)}
                      disabled={savingMethodId === method.delivery_method_id}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-brand-deep rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all text-xs disabled:opacity-50"
                    >
                      {savingMethodId === method.delivery_method_id ? <Loader2 size={14} className="animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingMethodId === method.delivery_method_id ? "Saving..." : "Save Delivery Settings"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
