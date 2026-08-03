import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

interface AdminConversation {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  assigned_admin_id: number | null;
  admin_name?: string;
  status: string;
  last_message?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// Get list of conversations for admin
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open"; // open, taken, all
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const offset = (page - 1) * limit;
    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];

    if (status !== "all") {
      whereClause += " AND cc.status = ?";
      params.push(status);
    }

    // Get conversations
    const conversations = await query<AdminConversation[]>(
      `SELECT cc.id, cc.customer_id, u.name as customer_name, u.email as customer_email,
              cc.assigned_admin_id, admin.name as admin_name, cc.status,
              (SELECT COUNT(*) FROM admin_chat_messages WHERE conversation_id = cc.id) as message_count,
              cc.created_at, cc.updated_at
       FROM admin_chat_conversations cc
       JOIN users u ON cc.customer_id = u.id
       LEFT JOIN users admin ON cc.assigned_admin_id = admin.id
       ${whereClause}
       ORDER BY cc.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // Get total count
    const countResult = await query<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM admin_chat_conversations cc ${whereClause}`,
      params,
    );

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getting conversations:", err);
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 },
    );
  }
}
