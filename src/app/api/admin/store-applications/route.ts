import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await requireAdminApi();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT
        sa.*,
        u.name  AS user_name,
        u.email AS user_email,
        (
          SELECT COUNT(*)
          FROM store_users su
          WHERE su.user_id = sa.user_id
            AND su.status = 'active'
        ) AS existing_store_count
      FROM store_applications sa
      JOIN users u ON u.id = sa.user_id
    `;

    const params: (string | number)[] = [];

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      sql += ` WHERE sa.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY sa.id DESC`;

    const applications = await query(sql, params);

    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error("Error fetching store applications for admin:", error);
    return NextResponse.json({ error: "Failed to fetch store applications" }, { status: 500 });
  }
}
