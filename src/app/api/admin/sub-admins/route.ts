import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";
import { validateSameOrigin } from "@/lib/request-security";
import { z } from "zod";

interface SubAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const emailSchema = z.string().email("Invalid email address").max(190).toLowerCase().trim();

export async function GET() {
  try {
    const access = await requireAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const subAdmins = await query<SubAdmin[]>(
      "SELECT id, name, email, role, created_at FROM users WHERE role IN ('sub_admin') ORDER BY created_at DESC",
    );

    return NextResponse.json({ subAdmins });
  } catch (err) {
    console.error("Error getting sub-admins:", err);
    return NextResponse.json({ error: "Failed to get sub-admins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const originError = validateSameOrigin(request);
    if (originError) return originError;

    const access = await requireAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Only super admins can promote to sub_admin
    const role = (access.session.user as { role?: string }).role;
    if (role !== "admin" && role !== "super_admin" && role !== "platform_admin") {
      return NextResponse.json({ error: "Only admins can add sub-admins" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const emailParsed = emailSchema.safeParse(body?.email);
    if (!emailParsed.success) {
      return NextResponse.json({ error: emailParsed.error.issues[0]?.message ?? "Invalid email" }, { status: 400 });
    }

    const targetEmail = emailParsed.data;

    const existingUser = await query<Array<{ id: number; role: string }>>(
      "SELECT id, role FROM users WHERE LOWER(email) = ? LIMIT 1",
      [targetEmail],
    );

    if (!existingUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser[0].role === "admin" || existingUser[0].role === "super_admin") {
      return NextResponse.json({ error: "Cannot change role of a super admin" }, { status: 400 });
    }

    await query("UPDATE users SET role = 'sub_admin' WHERE id = ?", [existingUser[0].id]);

    const updatedUser = await query<SubAdmin[]>(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [existingUser[0].id],
    );

    return NextResponse.json({ message: "Sub-admin added successfully", data: updatedUser[0] });
  } catch (err) {
    console.error("Error adding sub-admin:", err);
    return NextResponse.json({ error: "Failed to add sub-admin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = validateSameOrigin(request);
    if (originError) return originError;

    const access = await requireAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const role = (access.session.user as { role?: string }).role;
    if (role !== "admin" && role !== "super_admin" && role !== "platform_admin") {
      return NextResponse.json({ error: "Only admins can remove sub-admins" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    if (!userId || isNaN(parseInt(userId, 10))) {
      return NextResponse.json({ error: "Valid user ID is required" }, { status: 400 });
    }

    await query(
      "UPDATE users SET role = 'customer' WHERE id = ? AND role = 'sub_admin'",
      [parseInt(userId, 10)],
    );

    return NextResponse.json({ message: "Sub-admin removed successfully" });
  } catch (err) {
    console.error("Error removing sub-admin:", err);
    return NextResponse.json({ error: "Failed to remove sub-admin" }, { status: 500 });
  }
}
