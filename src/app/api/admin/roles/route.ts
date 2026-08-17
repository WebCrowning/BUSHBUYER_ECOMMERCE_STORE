import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RbacRepository } from "@/repositories/rbac.repository";

function isAdmin(role?: string) {
  return (
    role === "admin" ||
    role === "super_admin" ||
    role === "platform_admin"
  );
}

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user?.id || !isAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [roles, permissions] = await Promise.all([
      RbacRepository.getAllRoles(),
      RbacRepository.getAllPermissions(),
    ]);

    return NextResponse.json({ roles, permissions });
  } catch (err) {
    console.error("Admin RBAC GET error:", err);
    return NextResponse.json({ error: "Failed to fetch roles and permissions" }, { status: 500 });
  }
}
