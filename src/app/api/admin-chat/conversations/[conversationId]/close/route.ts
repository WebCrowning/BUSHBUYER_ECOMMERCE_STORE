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
      Array<{
        id: number;
        status: string;
        assigned_admin_id: number | null;
      }>
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

    // Can't close if not assigned to this admin
    if (conversation[0].assigned_admin_id !== userId) {
      return NextResponse.json(
        { error: "You can only close conversations assigned to you" },
        { status: 403 },
      );
    }

    // Can't close if already closed
    if (conversation[0].status === "closed") {
      return NextResponse.json(
        { error: "Conversation is already closed" },
        { status: 400 },
      );
    }

    // Close conversation
    await query(
      "UPDATE admin_chat_conversations SET status = 'closed', updated_at = NOW() WHERE id = ?",
      [conversationId],
    );

    return NextResponse.json({
      success: true,
      message: "Conversation closed successfully",
    });
  } catch (err) {
    console.error("Error closing conversation:", err);
    return NextResponse.json(
      { error: "Failed to close conversation" },
      { status: 500 },
    );
  }
}
