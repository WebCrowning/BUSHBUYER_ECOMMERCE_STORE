import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const authResult = await requireAdminApi();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const rows = await query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM store_applications WHERE status = 'pending'`,
      []
    );

    const count = Number(rows[0]?.count ?? 0);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching pending store application count:", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
