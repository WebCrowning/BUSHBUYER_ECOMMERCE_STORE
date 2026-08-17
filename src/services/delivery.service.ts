import { DeliveryRepository } from "@/repositories/delivery.repository";
import { StoreService } from "@/services/store.service";
import { StoreDeliveryMethod } from "@/types/delivery";

export class DeliveryService {
  static async resolveStoreDeliveryMethods(storeId: number): Promise<{
    methods: StoreDeliveryMethod[];
    defaultMethod: StoreDeliveryMethod | null;
  }> {
    const methods = await DeliveryRepository.getEnabledStoreDeliveryMethods(storeId);
    let defaultMethod = methods.find((m) => m.is_default) || methods[0] || null;

    return {
      methods,
      defaultMethod,
    };
  }

  static async calculateDeliveryFee(
    storeId: number,
    deliveryMethodId: number,
    cartSubtotal: number
  ): Promise<number> {
    const methods = await DeliveryRepository.getStoreDeliveryMethods(storeId);
    const selected = methods.find((m) => m.delivery_method_id === deliveryMethodId || m.id === deliveryMethodId);

    if (!selected || !selected.enabled) {
      return 0.0;
    }

    const config = selected.configuration || {};

    if (selected.code === "local_delivery") {
      const fee = Number(config.delivery_fee || 0);
      const freeThreshold = Number(config.free_delivery_threshold || 0);
      if (freeThreshold > 0 && cartSubtotal >= freeThreshold) {
        return 0.0;
      }
      return fee;
    }

    if (selected.code === "shipping") {
      const fee = Number(config.shipping_fee || 0);
      const freeThreshold = Number(config.free_shipping_threshold || 0);
      if (freeThreshold > 0 && cartSubtotal >= freeThreshold) {
        return 0.0;
      }
      return fee;
    }

    return 0.0;
  }

  static async updateStoreDeliveryConfig(
    operatorUserId: number,
    storeId: number,
    deliveryMethodId: number,
    enabled: boolean,
    isDefault: boolean,
    configuration: any
  ): Promise<void> {
    const canManage = await StoreService.canUserManageStore(operatorUserId, storeId);
    if (!canManage) {
      throw new Error("Forbidden: You do not have permission to update store delivery settings.");
    }

    await DeliveryRepository.upsertStoreDeliveryMethod(
      storeId,
      deliveryMethodId,
      enabled,
      isDefault,
      configuration
    );
  }
}
