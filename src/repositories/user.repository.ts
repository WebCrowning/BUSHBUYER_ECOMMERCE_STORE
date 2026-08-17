import { query } from "@/lib/db";
import { SystemRole } from "@/types/marketplace";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  provider: string;
  role: SystemRole;
  is_blocked: number;
  blocked_reason?: string | null;
  referred_by_store_id?: number | null;
  created_at: string;
}

export interface UserRowWithPassword extends UserRow {
  password_hash: string | null;
}

export class UserRepository {
  static async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow[]>(
      "SELECT id, name, email, image, provider, role, is_blocked, blocked_reason, referred_by_store_id, created_at FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  static async findByEmailWithPassword(email: string): Promise<UserRowWithPassword | null> {
    const rows = await query<UserRowWithPassword[]>(
      "SELECT id, name, email, image, provider, role, is_blocked, blocked_reason, referred_by_store_id, created_at, password_hash FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  static async findById(id: number): Promise<UserRow | null> {
    const rows = await query<UserRow[]>(
      "SELECT id, name, email, image, provider, role, is_blocked, blocked_reason, referred_by_store_id, created_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }

  static async searchUsers(searchTerm: string, limit = 20): Promise<UserRow[]> {
    const term = `%${searchTerm.trim().toLowerCase()}%`;
    return query<UserRow[]>(
      `SELECT id, name, email, image, provider, role, is_blocked, referred_by_store_id, created_at 
       FROM users 
       WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR CAST(id AS CHAR) LIKE ?
       ORDER BY id DESC LIMIT ?`,
      [term, term, term, limit]
    );
  }

  static async getAttributedUsersForStore(storeId: number, limit = 50, offset = 0): Promise<UserRow[]> {
    return query<UserRow[]>(
      `SELECT id, name, email, image, provider, role, is_blocked, referred_by_store_id, created_at 
       FROM users 
       WHERE referred_by_store_id = ?
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [storeId, limit, offset]
    );
  }

  static async createOrUpdateSocialUser(data: {
    name: string;
    email: string;
    image?: string | null;
    provider: string;
    referredByStoreId?: number | null;
  }): Promise<UserRow> {
    const existing = await this.findByEmail(data.email);
    if (!existing) {
      const res = await query<{ insertId: number }>(
        `INSERT INTO users (name, email, image, provider, role, referred_by_store_id)
         VALUES (?, ?, ?, ?, 'customer', ?)`,
        [data.name, data.email.toLowerCase().trim(), data.image || null, data.provider, data.referredByStoreId || null]
      );
      const newUser = await this.findById(res.insertId);
      return newUser!;
    } else {
      await query(
        `UPDATE users SET name = ?, image = ?, provider = ? ${data.referredByStoreId && !existing.referred_by_store_id ? ', referred_by_store_id = ?' : ''} WHERE id = ?`,
        data.referredByStoreId && !existing.referred_by_store_id 
          ? [data.name, data.image || null, data.provider, data.referredByStoreId, existing.id]
          : [data.name, data.image || null, data.provider, existing.id]
      );
      return (await this.findById(existing.id))!;
    }
  }

  static async updateUserRole(userId: number, role: SystemRole): Promise<void> {
    await query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
  }

  static async setReferredByStore(userId: number, storeId: number): Promise<void> {
    // Only set if not already attributed (first-attribution-wins)
    await query(
      "UPDATE users SET referred_by_store_id = ? WHERE id = ? AND referred_by_store_id IS NULL",
      [storeId, userId]
    );
  }

  static async listAllUsers(limit = 50, offset = 0): Promise<UserRow[]> {
    return query<UserRow[]>(
      "SELECT id, name, email, image, provider, role, is_blocked, referred_by_store_id, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
  }
}
