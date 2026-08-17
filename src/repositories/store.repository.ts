import { query } from "@/lib/db";
import { Store, StoreUser, SystemRole } from "@/types/marketplace";

export class StoreRepository {
  static async findById(id: number): Promise<Store | null> {
    const rows = await query<Store[]>("SELECT * FROM stores WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug: string): Promise<Store | null> {
    const rows = await query<Store[]>("SELECT * FROM stores WHERE slug = ? LIMIT 1", [slug]);
    return rows[0] || null;
  }

  static async listStores(status?: string, limit = 50, offset = 0): Promise<Store[]> {
    if (status) {
      return query<Store[]>(
        "SELECT * FROM stores WHERE store_status = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        [status, limit, offset]
      );
    }
    return query<Store[]>("SELECT * FROM stores ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  }

  static async createStore(data: Partial<Store>): Promise<Store> {
    const res = await query<{ insertId: number }>(
      `INSERT INTO stores (
        name, slug, logo, banner, description, business_category, email, phone, whatsapp, address, country, city, gps_coordinates, website, facebook, instagram, tiktok, youtube, linkedin, twitter
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.logo || null,
        data.banner || null,
        data.description || null,
        data.business_category || "General",
        data.email || null,
        data.phone || null,
        data.whatsapp || null,
        data.address || null,
        data.country || null,
        data.city || null,
        data.gps_coordinates || null,
        data.website || null,
        data.facebook || null,
        data.instagram || null,
        data.tiktok || null,
        data.youtube || null,
        data.linkedin || null,
        data.twitter || null,
      ]
    );

    // Initialize wallet for newly created store
    await query("INSERT INTO wallets (store_id) VALUES (?) ON DUPLICATE KEY UPDATE store_id=store_id", [res.insertId]);

    const created = await this.findById(res.insertId);
    return created!;
  }

  static async updateStore(id: number, data: Partial<Store>): Promise<void> {
    await query(
      `UPDATE stores SET
        name = COALESCE(?, name),
        logo = COALESCE(?, logo),
        banner = COALESCE(?, banner),
        description = COALESCE(?, description),
        business_category = COALESCE(?, business_category),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        whatsapp = COALESCE(?, whatsapp),
        address = COALESCE(?, address),
        country = COALESCE(?, country),
        city = COALESCE(?, city),
        gps_coordinates = COALESCE(?, gps_coordinates),
        website = COALESCE(?, website),
        facebook = COALESCE(?, facebook),
        instagram = COALESCE(?, instagram),
        tiktok = COALESCE(?, tiktok),
        youtube = COALESCE(?, youtube),
        linkedin = COALESCE(?, linkedin),
        twitter = COALESCE(?, twitter),
        verification_status = COALESCE(?, verification_status),
        store_status = COALESCE(?, store_status)
       WHERE id = ?`,
      [
        data.name || null,
        data.logo || null,
        data.banner || null,
        data.description || null,
        data.business_category || null,
        data.email || null,
        data.phone || null,
        data.whatsapp || null,
        data.address || null,
        data.country || null,
        data.city || null,
        data.gps_coordinates || null,
        data.website || null,
        data.facebook || null,
        data.instagram || null,
        data.tiktok || null,
        data.youtube || null,
        data.linkedin || null,
        data.twitter || null,
        data.verification_status || null,
        data.store_status || null,
        id,
      ]
    );
  }

  static async assignUserToStore(storeId: number, userId: number, storeRole: SystemRole): Promise<void> {
    await query(
      `INSERT INTO store_users (store_id, user_id, store_role, status)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE store_role = VALUES(store_role), status = 'active'`,
      [storeId, userId, storeRole]
    );
  }

  static async removeUserFromStore(storeId: number, userId: number): Promise<void> {
    await query("DELETE FROM store_users WHERE store_id = ? AND user_id = ?", [storeId, userId]);
  }

  static async setStoreUserStatus(
    storeId: number,
    userId: number,
    status: "active" | "suspended"
  ): Promise<void> {
    await query(
      "UPDATE store_users SET status = ? WHERE store_id = ? AND user_id = ?",
      [status, storeId, userId]
    );
  }

  static async getStoreUsers(storeId: number): Promise<StoreUser[]> {
    return query<StoreUser[]>(
      `SELECT su.id, su.store_id, su.user_id, su.store_role, su.status, u.name AS user_name, u.email AS user_email, u.image AS user_image
       FROM store_users su
       JOIN users u ON u.id = su.user_id
       WHERE su.store_id = ?`,
      [storeId]
    );
  }

  static async getUserStores(userId: number): Promise<Store[]> {
    return query<Store[]>(
      `SELECT s.*
       FROM stores s
       JOIN store_users su ON su.store_id = s.id
       WHERE su.user_id = ? AND su.status = 'active'`,
      [userId]
    );
  }

  static async isUserStoreStaff(userId: number, storeId: number): Promise<boolean> {
    const rows = await query<{ id: number }[]>(
      "SELECT id FROM store_users WHERE user_id = ? AND store_id = ? AND status = 'active' LIMIT 1",
      [userId, storeId]
    );
    return rows.length > 0;
  }

  static async followStore(storeId: number, userId: number): Promise<void> {
    await query("INSERT IGNORE INTO store_followers (store_id, user_id) VALUES (?, ?)", [storeId, userId]);
    await query("UPDATE stores SET followers_count = (SELECT COUNT(*) FROM store_followers WHERE store_id = ?) WHERE id = ?", [storeId, storeId]);
  }

  static async unfollowStore(storeId: number, userId: number): Promise<void> {
    await query("DELETE FROM store_followers WHERE store_id = ? AND user_id = ?", [storeId, userId]);
    await query("UPDATE stores SET followers_count = (SELECT COUNT(*) FROM store_followers WHERE store_id = ?) WHERE id = ?", [storeId, storeId]);
  }

  static async isFollowing(storeId: number, userId: number): Promise<boolean> {
    const rows = await query<{ id: number }[]>(
      "SELECT id FROM store_followers WHERE store_id = ? AND user_id = ? LIMIT 1",
      [storeId, userId]
    );
    return rows.length > 0;
  }
}
