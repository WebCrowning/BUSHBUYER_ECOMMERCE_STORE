import { StoreRepository } from "@/repositories/store.repository";
import { UserRepository } from "@/repositories/user.repository";
import { Store, StoreUser, SystemRole } from "@/types/marketplace";

export class StoreService {
  static async createStoreBySuperAdmin(
    operatorUserId: number,
    storeData: Partial<Store>,
    ownerUserId?: number
  ): Promise<Store> {
    const operator = await UserRepository.findById(operatorUserId);
    if (!operator || operator.role !== "super_admin") {
      throw new Error("Forbidden: Only Super Admin can create new stores.");
    }

    if (!storeData.name || !storeData.slug) {
      throw new Error("Store name and slug are required.");
    }

    const existingSlug = await StoreRepository.findBySlug(storeData.slug);
    if (existingSlug) {
      throw new Error("A store with this URL slug already exists.");
    }

    const store = await StoreRepository.createStore(storeData);

    // Assign owner if specified
    if (ownerUserId) {
      await StoreRepository.assignUserToStore(store.id, ownerUserId, "store_owner");
      await UserRepository.updateUserRole(ownerUserId, "store_owner");
    }

    return store;
  }

  /**
   * Super Admin can manage ANY store as if owner.
   * Store staff can manage their assigned store.
   */
  static async canUserManageStore(userId: number, storeId: number): Promise<boolean> {
    const user = await UserRepository.findById(userId);
    if (!user || user.is_blocked) return false;

    if (user.role === "super_admin" || user.role === "platform_admin") {
      return true;
    }

    return StoreRepository.isUserStoreStaff(userId, storeId);
  }

  static async assignStaff(
    operatorUserId: number,
    storeId: number,
    targetUserId: number,
    role: SystemRole
  ): Promise<void> {
    const canManage = await this.canUserManageStore(operatorUserId, storeId);
    if (!canManage) {
      throw new Error("Unauthorized to manage store staff.");
    }

    await StoreRepository.assignUserToStore(storeId, targetUserId, role);
  }

  static async removeStaff(
    operatorUserId: number,
    storeId: number,
    targetUserId: number
  ): Promise<void> {
    const canManage = await this.canUserManageStore(operatorUserId, storeId);
    if (!canManage) {
      throw new Error("Unauthorized to manage store staff.");
    }

    await StoreRepository.removeUserFromStore(storeId, targetUserId);
  }
}
