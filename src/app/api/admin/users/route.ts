import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";

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
