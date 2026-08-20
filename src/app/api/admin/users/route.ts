import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { getConnection, query } from "@/lib/db";
import { validateSameOrigin } from "@/lib/request-security";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_blocked: number;
  blocked_reason: string | null;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    // Require admin role — previously only checked for a valid session
    const access = await requireAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("query") || searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const role = searchParams.get("role");
    const blocked = searchParams.get("blocked");

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (searchQuery.trim()) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      conditions.push("(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR CAST(id AS CHAR) LIKE ?)");
      params.push(term, term, term);
    }

    if (blocked === "true") {
      conditions.push("is_blocked = 1");
    } else if (blocked === "false") {
      conditions.push("is_blocked = 0");
    }

    if (role) {
      conditions.push("role = ?");
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await query<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params,
    );

    const total = countResult[0]?.count || 0;

    // Get paginated users
    const users = await query<User[]>(
      `SELECT id, name, email, image, role, is_blocked, blocked_reason, referred_by_store_id, created_at 
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getting users:", err);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 },
    );
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

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("id");
    if (!userIdParam || isNaN(parseInt(userIdParam, 10))) {
      return NextResponse.json({ error: "Valid User ID is required" }, { status: 400 });
    }

    const targetId = parseInt(userIdParam, 10);
    const currentAdminEmail = access.session.user?.email ?? "";
    const currentAdminId = access.session.user?.id ? parseInt(String(access.session.user.id), 10) : null;

    // Check target user
    const targetUsers = await query<Array<{ id: number; email: string; role: string }>>(
      "SELECT id, email, role FROM users WHERE id = ? LIMIT 1",
      [targetId],
    );

    if (!targetUsers.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = targetUsers[0];

    // Prevent self-deletion
    if (
      (currentAdminId && currentAdminId === targetUser.id) ||
      (currentAdminEmail && currentAdminEmail.toLowerCase() === targetUser.email.toLowerCase())
    ) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Prevent deleting admin users
    if (
      targetUser.role === "admin" ||
      targetUser.role === "super_admin" ||
      targetUser.role === "platform_admin"
    ) {
      return NextResponse.json({ error: "Cannot delete an administrative user" }, { status: 400 });
    }

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Clean up user-related records across dependent tables safely
      await conn.query("DELETE FROM user_permissions WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM store_users WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM store_followers WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM notifications WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM admin_online_status WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM paypal_checkout_sessions WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM messages WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM customer_service_messages WHERE user_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM admin_chat_messages WHERE sender_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM admin_chat_conversations WHERE customer_id = ?", [targetId]).catch(() => {});
      await conn.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", [targetId]).catch(() => {});
      await conn.query("DELETE FROM orders WHERE user_id = ?", [targetId]).catch(() => {});

      // Delete user
      await conn.query("DELETE FROM users WHERE id = ?", [targetId]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

