import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

type UserRow = {
  id: number;
  role: string;
};

type ConversationRow = {
  id: number;
  status: string;
  assigned_admin_id: number | null;
};

function isPrivilegedAdmin(role: string, _email: string) {
  const normalizedRole = role?.toLowerCase?.() ?? "";
  return (
    normalizedRole === "admin" ||
    normalizedRole === "sub_admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "platform_admin"
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    const users = await query<UserRow[]>(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (!users.length) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = users[0];
    if (!isPrivilegedAdmin(currentUser.role, email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conversations = await query<ConversationRow[]>(
      "SELECT id, status, assigned_admin_id FROM admin_chat_conversations WHERE id = ? LIMIT 1",
      [conversationId],
    );

    if (!conversations.length) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversation = conversations[0];

    if (conversation.status !== "closed") {
      return NextResponse.json({ error: "Conversation is not closed" }, { status: 400 });
    }

    const assignedAdminId = conversation.assigned_admin_id ?? currentUser.id;

    await query(
      "UPDATE admin_chat_conversations SET status = 'taken', assigned_admin_id = ?, updated_at = NOW() WHERE id = ?",
      [assignedAdminId, conversationId],
    );

    return NextResponse.json({ ok: true, status: "taken" });
  } catch (err) {
    console.error("Error reopening conversation:", err);
    return NextResponse.json({ error: "Failed to reopen conversation" }, { status: 500 });
  }
}
