export type DeliveryCode = "local_delivery" | "shipping" | "store_pickup" | "digital_delivery" | string;

export interface GlobalDeliveryMethod {
  id: number;
  name: string;
  code: DeliveryCode;
  description?: string | null;
  active: boolean;
  created_at?: string;
}

export interface LocalDeliveryConfig {
  cities: string[];
  delivery_fee: number;
  free_delivery_threshold?: number;
  estimated_time?: string;
  delivery_notes?: string;
}

export interface ShippingConfig {
  shipping_regions: string[];
  shipping_fee: number;
  free_shipping_threshold?: number;
  courier_name?: string;
  tracking_enabled?: boolean;
  estimated_time?: string;
}

export interface StorePickupConfig {
  pickup_address: string;
  business_hours: string;
  contact_phone?: string;
  pickup_instructions?: string;
}

export interface DigitalDeliveryConfig {
  download_limit?: number;
  expiration_days?: number;
  instructions?: string;
}

export interface StoreDeliveryMethod {
  id: number;
  store_id: number;
  delivery_method_id: number;
  enabled: boolean;
  is_default: boolean;
  configuration: LocalDeliveryConfig | ShippingConfig | StorePickupConfig | DigitalDeliveryConfig | any;
  name?: string;
  code?: DeliveryCode;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDeliveryDetails {
  delivery_method_id: number;
  delivery_code: DeliveryCode;
  fullName: string;
  phone: string;
  region?: string;
  city?: string;
  address?: string;
  neighborhood?: string;
  landmark?: string;
  postalCode?: string;
  deliveryInstructions?: string;
}
