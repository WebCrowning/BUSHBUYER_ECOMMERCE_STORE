import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { env } from "@/lib/env";

type AdminGuardSession = {
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
  };
} | null;

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  const adminLoginEmail = (process.env.ADMIN_LOGIN_EMAIL ?? "").trim().toLowerCase();

  return (
    env.adminEmails.includes(normalizedEmail) ||
    (adminLoginEmail.length > 0 && normalizedEmail === adminLoginEmail)
  );
}

function isAdminSession(session: AdminGuardSession) {
  const role = session?.user?.role;
  if (role === "admin" || role === "sub_admin") {
    return true;
  }

  return isAdminEmail(session?.user?.email);
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
