import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { StoreRepository } from "@/repositories/store.repository";

type AdminGuardSession = {
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
  };
} | null;

export function isAdminEmail(email?: string | null) {
  // Admin privileges are determined strictly by MySQL user roles (admin, sub_admin, super_admin, platform_admin)
  return false;
}

function isAdminSession(session: AdminGuardSession) {
  const role = session?.user?.role;
  return (
    role === "admin" ||
    role === "sub_admin" ||
    role === "super_admin" ||
    role === "platform_admin"
  );
}

export async function requireUserPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session;
}

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/admin-login");
  }
  if (!isAdminSession(session)) {
    redirect("/admin-login?error=forbidden");
  }
  return session;
}

export async function requireStorePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  const userId = Number(session.user.id);
  const role = (session.user as { role?: string }).role;
  const isSuperAdmin = isAdminSession(session);
  const userStores = await StoreRepository.getUserStores(userId);

  if (!isSuperAdmin && userStores.length === 0) {
    redirect("/admin-login?error=forbidden");
  }

  const primaryStore = userStores[0] || (await StoreRepository.findById(1));
  return { session, userId, role, isSuperAdmin, userStores, primaryStore };
}

export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 as const };
  }
  if (!isAdminSession(session)) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session };
}

export async function requireStoreOrAdminApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 as const };
  }
  const userId = Number(session.user.id);
  const role = (session.user as { role?: string }).role;
  const isSuperAdmin = isAdminSession(session);
  const userStores = await StoreRepository.getUserStores(userId);
  const userStoreIds = userStores.map((s) => s.id);

  if (!isSuperAdmin && userStoreIds.length === 0) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { session, userId, role, isSuperAdmin, userStores, userStoreIds, primaryStoreId: userStoreIds[0] };
}
