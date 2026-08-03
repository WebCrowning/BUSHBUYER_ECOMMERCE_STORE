import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

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

    // Get conversation
    const conversation = await query<
      Array<{ id: number; status: string; assigned_admin_id: number | null }>
    >(
      "SELECT id, status, assigned_admin_id FROM admin_chat_conversations WHERE id = ?",
      [conversationId],
    );

    if (!conversation.length) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Can only take open conversations that aren't already assigned
    if (conversation[0].status !== "open" || conversation[0].assigned_admin_id) {
      return NextResponse.json(
        { error: "This conversation cannot be taken" },
        { status: 400 },
      );
    }

    // Assign to current admin
    await query(
      "UPDATE admin_chat_conversations SET assigned_admin_id = ?, status = 'taken', updated_at = NOW() WHERE id = ?",
      [userId, conversationId],
    );

    return NextResponse.json({
      success: true,
      message: "Conversation taken successfully",
    });
  } catch (err) {
    console.error("Error taking conversation:", err);
    return NextResponse.json(
      { error: "Failed to take conversation" },
      { status: 500 },
    );
  }
}
