import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

interface BlockResponse {
  message: string;
  blocked: boolean;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.userId || !body?.reason) {
      return NextResponse.json(
        { error: "User ID and reason are required" },
        { status: 400 },
      );
    }

    const sessionRole = (session.user as { role?: string }).role;

    // Check if user is admin from MySQL database session role
    const isAdmin =
      sessionRole === "admin" ||
      sessionRole === "sub_admin" ||
      sessionRole === "super_admin" ||
      sessionRole === "platform_admin";
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    // Get current user's id from database for audit trail
    const currentUser = await query<Array<{ id: number }>>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [session.user.email],
    );
    const currentUserId = currentUser[0]?.id ?? null;

    // Get target user's role
    const targetUser = await query<Array<{ role: string }>>(
      "SELECT role FROM users WHERE id = ?",
      [body.userId],
    );

    if (!targetUser.length) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    const targetRole = targetUser[0].role;

    // Admin cannot block another admin
    if (targetRole === "admin") {
      return NextResponse.json(
        { error: "Cannot block an admin user" },
        { status: 400 },
      );
    }

    // Prevent self-blocking
    if (currentUserId && currentUserId === body.userId) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 },
      );
    }

    // Block the user
    await query(
      "UPDATE users SET is_blocked = 1, blocked_reason = ?, blocked_at = NOW(), blocked_by = ? WHERE id = ?",
      [body.reason, currentUserId, body.userId],
    );

    return NextResponse.json({
      message: "User blocked successfully",
      blocked: true,
    });
  } catch (err) {
    console.error("Error blocking user:", err);
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const sessionRole = (session.user as { role?: string }).role;

    // Check if user is admin from MySQL database session role
    const isAdmin =
      sessionRole === "admin" ||
      sessionRole === "sub_admin" ||
      sessionRole === "super_admin" ||
      sessionRole === "platform_admin";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get target user's role
    const targetUser = await query<Array<{ role: string }>>(
      "SELECT role FROM users WHERE id = ?",
      [userId],
    );

    if (!targetUser.length) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    // Unblock the user
    await query(
      "UPDATE users SET is_blocked = 0, blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL WHERE id = ?",
      [userId],
    );

    return NextResponse.json({
      message: "User unblocked successfully",
      blocked: false,
    });
  } catch (err) {
    console.error("Error unblocking user:", err);
    return NextResponse.json(
      { error: "Failed to unblock user" },
      { status: 500 },
    );
  }
}
