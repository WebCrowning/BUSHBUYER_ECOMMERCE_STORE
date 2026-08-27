import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { UserRepository } from "@/repositories/user.repository";
import { SystemRole } from "@/types/marketplace";

async function isAuthorizedForStore(userId: number, sessionRole: string | undefined, storeId: number): Promise<boolean> {
  if (
    sessionRole === "admin" ||
    sessionRole === "sub_admin" ||
    sessionRole === "super_admin" ||
    sessionRole === "platform_admin"
  ) {
    return true;
  }
  const userStores = await StoreRepository.getUserStores(userId);
  return userStores.some((s) => s.id === storeId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id ? parseInt(session.user.id, 10) : NaN;
    const role = (session?.user as { role?: string })?.role;
    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    if (isNaN(sessionUserId) || !(await isAuthorizedForStore(sessionUserId, role, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await StoreRepository.getStoreUsers(id);
    const attributedUsers = await UserRepository.getAttributedUsersForStore(id);
    return NextResponse.json({ staff, attributedUsers });
  } catch (err) {
    console.error("Store staff GET error:", err);
    return NextResponse.json({ error: "Failed to fetch store staff" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id ? parseInt(session.user.id, 10) : NaN;
    const role = (session?.user as { role?: string })?.role;
    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    if (isNaN(sessionUserId) || !(await isAuthorizedForStore(sessionUserId, role, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only platform-level admins may assign staff — store owners/managers cannot
    const platformAdminRoles = ["admin", "sub_admin", "super_admin", "platform_admin"];
    if (!platformAdminRoles.includes(role ?? "")) {
      return NextResponse.json(
        { error: "Only platform admins can assign staff to a store" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.userId || !body?.storeRole) {
      return NextResponse.json({ error: "User ID and store role are required" }, { status: 400 });
    }

    const userId = parseInt(body.userId, 10);
    const storeRole = body.storeRole as SystemRole;

    await StoreRepository.assignUserToStore(id, userId, storeRole);

    const staff = await StoreRepository.getStoreUsers(id);
    const attributedUsers = await UserRepository.getAttributedUsersForStore(id);
    return NextResponse.json({ staff, attributedUsers }, { status: 201 });
  } catch (err) {
    console.error("Store staff POST error:", err);
    return NextResponse.json({ error: "Failed to assign staff to store" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id ? parseInt(session.user.id, 10) : NaN;
    const role = (session?.user as { role?: string })?.role;
    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    if (isNaN(sessionUserId) || !(await isAuthorizedForStore(sessionUserId, role, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = parseInt(body?.userId, 10);
    const status = body?.status as string;

    if (isNaN(userId)) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    if (status !== "active" && status !== "suspended") {
      return NextResponse.json({ error: "Status must be 'active' or 'suspended'" }, { status: 400 });
    }

    // Prevent acting on yourself
    if (userId === sessionUserId) {
      return NextResponse.json({ error: "You cannot change your own store status" }, { status: 400 });
    }

    // Prevent blocking a store_owner (only super admins can do that)
    const storeUsers = await StoreRepository.getStoreUsers(id);
    const target = storeUsers.find((su) => su.user_id === userId);
    if (!target) {
      return NextResponse.json({ error: "User is not a member of this store" }, { status: 404 });
    }
    if (
      target.store_role === "store_owner" &&
      role !== "admin" &&
      role !== "sub_admin" &&
      role !== "super_admin" &&
      role !== "platform_admin"
    ) {
      return NextResponse.json({ error: "Store owners can only be managed by platform admins" }, { status: 403 });
    }

    await StoreRepository.setStoreUserStatus(id, userId, status);

    const staff = await StoreRepository.getStoreUsers(id);
    const attributedUsers = await UserRepository.getAttributedUsersForStore(id);
    return NextResponse.json({ staff, attributedUsers });
  } catch (err) {
    console.error("Store staff PATCH error:", err);
    return NextResponse.json({ error: "Failed to update staff status" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id ? parseInt(session.user.id, 10) : NaN;
    const role = (session?.user as { role?: string })?.role;
    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    if (isNaN(sessionUserId) || !(await isAuthorizedForStore(sessionUserId, role, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");
    if (!userIdStr) return NextResponse.json({ error: "User ID parameter required" }, { status: 400 });

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

    // Protect store_owner from being removed by staff
    const storeUsers = await StoreRepository.getStoreUsers(id);
    const target = storeUsers.find((su) => su.user_id === userId);
    if (
      target?.store_role === "store_owner" &&
      role !== "admin" &&
      role !== "sub_admin" &&
      role !== "super_admin" &&
      role !== "platform_admin"
    ) {
      return NextResponse.json({ error: "Store owners can only be managed by platform admins" }, { status: 403 });
    }

    await StoreRepository.removeUserFromStore(id, userId);

    const staff = await StoreRepository.getStoreUsers(id);
    const attributedUsers = await UserRepository.getAttributedUsersForStore(id);
    return NextResponse.json({ staff, attributedUsers });
  } catch (err) {
    console.error("Store staff DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove staff from store" }, { status: 500 });
  }
}
