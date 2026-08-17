import { auth } from "@/auth";
import { RbacService } from "@/services/rbac.service";
import { PermissionSlug, SystemRole } from "@/types/marketplace";
import { NextResponse } from "next/server";

export async function requireAuthPermission(
  requiredPermission?: PermissionSlug,
  requiredRole?: SystemRole | SystemRole[]
) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized: Sign in required" }, { status: 401 }),
      user: null,
    };
  }

  const userId = Number(session.user.id);
  const isAllowed = await RbacService.validateRoleOrPermission(userId, requiredRole, requiredPermission);

  if (!isAllowed) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 }),
      user: session.user,
    };
  }

  return {
    authorized: true,
    response: null,
    user: session.user,
    userId,
  };
}
