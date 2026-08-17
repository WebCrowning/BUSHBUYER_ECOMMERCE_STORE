import { query } from "@/lib/db";
import { Permission, PermissionSlug, Role, SystemRole } from "@/types/marketplace";

export class RbacRepository {
  static async getAllRoles(): Promise<Role[]> {
    return query<Role[]>("SELECT * FROM roles ORDER BY id ASC");
  }

  static async getAllPermissions(): Promise<Permission[]> {
    return query<Permission[]>("SELECT * FROM permissions ORDER BY module ASC, name ASC");
  }

  static async getUserPermissions(userId: number): Promise<PermissionSlug[]> {
    // 1. Get permissions from user's primary role
    const rolePermissions = await query<{ slug: PermissionSlug }[]>(
      `SELECT p.slug
       FROM users u
       JOIN roles r ON r.slug = u.role
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = ?`,
      [userId]
    );

    // 2. Get specific granted/revoked permissions in user_permissions table
    const explicitPermissions = await query<{ slug: PermissionSlug; is_granted: number }[]>(
      `SELECT p.slug, up.is_granted
       FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = ?`,
      [userId]
    );

    const permSet = new Set<PermissionSlug>(rolePermissions.map((rp) => rp.slug));

    for (const exp of explicitPermissions) {
      if (exp.is_granted) {
        permSet.add(exp.slug);
      } else {
        permSet.delete(exp.slug);
      }
    }

    return Array.from(permSet);
  }

  static async grantUserPermission(userId: number, permissionSlug: PermissionSlug): Promise<void> {
    const permRows = await query<Permission[]>("SELECT id FROM permissions WHERE slug = ? LIMIT 1", [permissionSlug]);
    if (!permRows[0]) return;
    await query(
      `INSERT INTO user_permissions (user_id, permission_id, is_granted)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE is_granted = 1`,
      [userId, permRows[0].id]
    );
  }

  static async revokeUserPermission(userId: number, permissionSlug: PermissionSlug): Promise<void> {
    const permRows = await query<Permission[]>("SELECT id FROM permissions WHERE slug = ? LIMIT 1", [permissionSlug]);
    if (!permRows[0]) return;
    await query(
      `INSERT INTO user_permissions (user_id, permission_id, is_granted)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE is_granted = 0`,
      [userId, permRows[0].id]
    );
  }
}
