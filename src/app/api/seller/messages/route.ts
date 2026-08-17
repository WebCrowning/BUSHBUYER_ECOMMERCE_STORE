import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";

type MessageRow = {
  id: number;
  user_id: number | null;
  customer_email: string;
  message: string;
  reply: string | null;
  status: string;
  created_at: string;
};

/**
 * GET /api/seller/messages?storeId=<id>
 *
 * Returns contact messages from users who were attributed to this store
 * (referred_by_store_id = storeId). Also includes guest messages sent by email
 * addresses that match those attributed users.
 *
 * Super admins may pass any storeId; store staff are restricted to their own stores.
 */
export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const overrideStoreId = searchParams.get("storeId");
  const storeId = overrideStoreId
    ? parseInt(overrideStoreId, 10)
    : access.primaryStoreId;

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
  }

  // Verify the requester is authorised for this store
  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch messages whose user_id belongs to a user attributed to this store,
    // OR whose customer_email matches an attributed user's email.
    const messages = await query<MessageRow[]>(
      `SELECT m.id, m.user_id, m.customer_email, m.message, m.reply, m.status, m.created_at
       FROM messages m
       WHERE (
         m.user_id IN (
           SELECT id FROM users WHERE referred_by_store_id = ?
         )
         OR m.customer_email IN (
           SELECT email FROM users WHERE referred_by_store_id = ?
         )
       )
       ORDER BY m.created_at DESC`,
      [storeId, storeId]
    );

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Seller messages GET error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
