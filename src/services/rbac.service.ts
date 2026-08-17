import { RbacRepository } from "@/repositories/rbac.repository";
import { UserRepository } from "@/repositories/user.repository";
import { PermissionSlug, SystemRole } from "@/types/marketplace";

export class RbacService {
  /**
   * Super Admins automatically possess all permissions.
   * Other roles check role_permissions & user_permissions tables.
   */
  static async hasPermission(userId: number, permission: PermissionSlug): Promise<boolean> {
    const user = await UserRepository.findById(userId);
    if (!user || user.is_blocked) return false;

    if (user.role === "super_admin") {
      return true;
    }

    const userPerms = await RbacRepository.getUserPermissions(userId);
    return userPerms.includes(permission);
  }

  static async validateRoleOrPermission(
    userId: number,
    requiredRole?: SystemRole | SystemRole[],
    requiredPermission?: PermissionSlug
  ): Promise<boolean> {
    const user = await UserRepository.findById(userId);
    if (!user || user.is_blocked) return false;

    if (user.role === "super_admin") return true;

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (allowedRoles.includes(user.role)) return true;
    }

    if (requiredPermission) {
      return this.hasPermission(userId, requiredPermission);
    }

    return false;
  }
}
