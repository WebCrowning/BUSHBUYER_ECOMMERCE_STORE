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
  message_count: number;
  created_at: string;
  updated_at: string;
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "sub_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const conversationId = Number.parseInt(id, 10);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
    }

    const rows = await query<AdminConversation[]>(
      `SELECT cc.id, cc.customer_id, u.name as customer_name, u.email as customer_email,
              cc.assigned_admin_id, admin.name as admin_name, cc.status,
              (SELECT COUNT(*) FROM admin_chat_messages WHERE conversation_id = cc.id) as message_count,
              cc.created_at, cc.updated_at
       FROM admin_chat_conversations cc
       JOIN users u ON cc.customer_id = u.id
       LEFT JOIN users admin ON cc.assigned_admin_id = admin.id
       WHERE cc.id = ?
       LIMIT 1`,
      [conversationId],
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: rows[0] });
  } catch (err) {
    console.error("Error getting conversation:", err);
    return NextResponse.json({ error: "Failed to get conversation" }, { status: 500 });
  }
}
