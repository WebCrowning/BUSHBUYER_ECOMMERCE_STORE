import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// Get all admins and their online status
export async function GET() {
  try {
    const admins = await query<Array<{ id: number; name: string; email: string; status: string }>>(
      `SELECT u.id, u.name, u.email, COALESCE(aos.status, 'offline') as status
       FROM users u
       LEFT JOIN admin_online_status aos ON u.id = aos.user_id
       WHERE u.role IN ('admin', 'sub_admin')
       ORDER BY u.name`,
    );

    return NextResponse.json({ admins });
  } catch (err) {
    console.error("Error getting admins:", err);
    // If table doesn't exist or other error, return empty admins list (treat as no admin online)
    return NextResponse.json({ admins: [] });
  }
}

// Update admin online status
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    // Get current user
    const currentUser = await query<Array<{ id: number; role: string }>>(
      "SELECT id, role FROM users WHERE email = ?",
      [session.user.email],
    );

    if (!currentUser.length) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser[0].id;
    const userRole = currentUser[0].role;
    if (userRole !== "admin" && userRole !== "sub_admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Insert or update admin status
    await query(
      `INSERT INTO admin_online_status (user_id, status) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE status = ?, last_seen = NOW()`,
      [userId, body.status, body.status],
    );

    return NextResponse.json({ message: "Status updated" });
  } catch (err) {
    console.error("Error updating status:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
