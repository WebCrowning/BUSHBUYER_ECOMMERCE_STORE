import { query } from "@/lib/db";
import { GlobalDeliveryMethod, StoreDeliveryMethod } from "@/types/delivery";

export class DeliveryRepository {
  static async getAllGlobalMethods(): Promise<GlobalDeliveryMethod[]> {
    return query<GlobalDeliveryMethod[]>(
      "SELECT id, name, code, description, active, created_at FROM delivery_methods WHERE active = 1 ORDER BY id ASC"
    );
  }

  static async createGlobalMethod(name: string, code: string, description?: string): Promise<GlobalDeliveryMethod> {
    const res = await query<{ insertId: number }>(
      "INSERT INTO delivery_methods (name, code, description, active) VALUES (?, ?, ?, 1)",
      [name, code, description || null]
    );

    const created = await query<GlobalDeliveryMethod[]>(
      "SELECT * FROM delivery_methods WHERE id = ? LIMIT 1",
      [res.insertId]
    );

    return created[0];
  }

  static async getStoreDeliveryMethods(storeId: number): Promise<StoreDeliveryMethod[]> {
    const rows = await query<any[]>(
      `SELECT
        sdm.id,
        sdm.store_id,
        dm.id AS delivery_method_id,
        sdm.enabled,
        sdm.is_default,
        sdm.configuration,
        dm.name,
        dm.code,
        dm.description,
        sdm.created_at,
        sdm.updated_at
       FROM delivery_methods dm
       LEFT JOIN store_delivery_methods sdm ON sdm.delivery_method_id = dm.id AND sdm.store_id = ?
       WHERE dm.active = 1
       ORDER BY dm.id ASC`,
      [storeId]
    );

    return rows.map((r) => ({
      id: r.id || 0,
      store_id: storeId,
      delivery_method_id: Number(r.delivery_method_id),
      enabled: Boolean(r.enabled),
      is_default: Boolean(r.is_default),
      configuration: r.configuration ? (typeof r.configuration === "string" ? JSON.parse(r.configuration) : r.configuration) : {},
      name: r.name,
      code: r.code,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  static async getEnabledStoreDeliveryMethods(storeId: number): Promise<StoreDeliveryMethod[]> {
    const all = await this.getStoreDeliveryMethods(storeId);
    return all.filter((m) => m.enabled);
  }

  static async upsertStoreDeliveryMethod(
    storeId: number,
    deliveryMethodId: number,
    enabled: boolean,
    isDefault: boolean,
    configuration: any
  ): Promise<void> {
    if (isDefault) {
      // Clear previous default
      await query("UPDATE store_delivery_methods SET is_default = 0 WHERE store_id = ?", [storeId]);
    }

    const configJson = typeof configuration === "string" ? configuration : JSON.stringify(configuration || {});

    await query(
      `INSERT INTO store_delivery_methods (store_id, delivery_method_id, enabled, is_default, configuration)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        is_default = VALUES(is_default),
        configuration = VALUES(configuration)`,
      [storeId, deliveryMethodId, enabled ? 1 : 0, isDefault ? 1 : 0, configJson]
    );
  }

  static async setDefaultDeliveryMethod(storeId: number, deliveryMethodId: number): Promise<void> {
    await query("UPDATE store_delivery_methods SET is_default = 0 WHERE store_id = ?", [storeId]);
    await query(
      "UPDATE store_delivery_methods SET is_default = 1 WHERE store_id = ? AND delivery_method_id = ?",
      [storeId, deliveryMethodId]
    );
  }
}
