"use client";

import { useEffect, useState } from "react";
import { CustomerDeliveryDetails, StoreDeliveryMethod } from "@/types/delivery";
import { Truck, MapPin, Building, FileCode, CheckCircle2, Clock, MapPinOff } from "lucide-react";

interface DeliveryMethodSelectorProps {
  storeId: number;
  cartSubtotal: number;
  onChange: (details: CustomerDeliveryDetails, deliveryFee: number) => void;
}

export function DeliveryMethodSelector({ storeId, cartSubtotal, onChange }: DeliveryMethodSelectorProps) {
  const [methods, setMethods] = useState<StoreDeliveryMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [landmark, setLandmark] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  useEffect(() => {
    fetchDeliveryMethods();
  }, [storeId]);

  const fetchDeliveryMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/delivery`);
      if (res.ok) {
        const data = await res.json();
        const enabled: StoreDeliveryMethod[] = (data.methods || []).filter((m: StoreDeliveryMethod) => m.enabled);
        setMethods(enabled);

        // Pick default method or first enabled
        const defaultMethod = enabled.find((m) => m.is_default) || enabled[0];
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.delivery_method_id);
        }
      }
    } catch (err) {
      console.error("Error fetching checkout delivery methods:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = methods.find((m) => m.delivery_method_id === selectedMethodId);

  // Calculate Delivery Fee dynamically
  const calculateFee = (method?: StoreDeliveryMethod) => {
    if (!method) return 0;
    const config = method.configuration || {};
    if (method.code === "local_delivery") {
      const fee = Number(config.delivery_fee || 0);
      const freeThreshold = Number(config.free_delivery_threshold || 0);
      if (freeThreshold > 0 && cartSubtotal >= freeThreshold) return 0;
      return fee;
    }
    if (method.code === "shipping") {
      const fee = Number(config.shipping_fee || 0);
      const freeThreshold = Number(config.free_shipping_threshold || 0);
      if (freeThreshold > 0 && cartSubtotal >= freeThreshold) return 0;
      return fee;
    }
    return 0;
  };

  useEffect(() => {
    if (selectedMethod) {
      const fee = calculateFee(selectedMethod);
      onChange(
        {
          delivery_method_id: selectedMethod.delivery_method_id,
          delivery_code: selectedMethod.code || "local_delivery",
          fullName: "",
          phone: "",
          region: "",
          city: "",
          address: "",
          neighborhood: "",
          landmark: "",
          postalCode: "",
          deliveryInstructions: "",
        },
        fee
      );
    }
  }, [selectedMethodId, cartSubtotal]);

  if (loading) {
    return <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500">Loading delivery options...</div>;
  }

  if (methods.length === 0) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
        <MapPinOff className="w-4 h-4 text-amber-600" />
        No specific delivery methods enabled for this store. Standard delivery will apply.
      </div>
    );
  }

  const getIcon = (code?: string) => {
    switch (code) {
      case "local_delivery":
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case "shipping":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "store_pickup":
        return <Building className="w-4 h-4 text-amber-600" />;
      case "digital_delivery":
        return <FileCode className="w-4 h-4 text-purple-600" />;
      default:
        return <Truck className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const isSelected = method.delivery_method_id === selectedMethodId;
          const fee = calculateFee(method);
          return (
            <label
              key={method.delivery_method_id}
              onClick={() => setSelectedMethodId(method.delivery_method_id)}
              className={`p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="delivery_method"
                checked={isSelected}
                onChange={() => setSelectedMethodId(method.delivery_method_id)}
                className="mt-0.5 accent-emerald-600"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    {getIcon(method.code)} {method.name}
                  </span>
                  <span className="text-emerald-700">
                    {fee === 0 ? "FREE" : `$${fee.toFixed(2)}`}
                  </span>
                </div>
                <p className="text-gray-500 mt-1 text-[11px]">{method.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Info card for Store Pickup or Digital Delivery */}
      {selectedMethod && selectedMethod.code === "store_pickup" && (
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5 text-xs text-amber-900">
          <p className="font-bold flex items-center gap-1.5">
            <Building className="w-4 h-4 text-amber-600" /> Pickup Address:
          </p>
          <p className="text-gray-800">{selectedMethod.configuration?.pickup_address || "Store Main Branch"}</p>
          <p className="text-gray-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {selectedMethod.configuration?.business_hours || "Mon-Sat: 8:00 AM - 6:00 PM"}
          </p>
        </div>
      )}

      {selectedMethod && selectedMethod.code === "digital_delivery" && (
        <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-1.5 text-xs text-purple-900">
          <p className="font-bold flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-purple-600" /> Instant Digital Delivery
          </p>
          <p className="text-gray-600">
            {selectedMethod.configuration?.instructions || "Your access link will be generated automatically upon payment completion."}
          </p>
        </div>
      )}
    </div>
  );
}
