import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { createAdminNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const applications = await query(
      `SELECT * FROM store_applications WHERE user_id = ? ORDER BY id DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error("Error fetching user store applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userEmail = session.user.email || "";
    const userName = session.user.name || "User";

    const body = await req.json();
    const { store_name, business_category, products_description, phone, email, additional_notes } = body;

    if (!store_name || typeof store_name !== "string" || !store_name.trim()) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    if (!products_description || typeof products_description !== "string" || !products_description.trim()) {
      return NextResponse.json({ error: "Products description is required" }, { status: 400 });
    }

    // Check if user already has a pending application
    const existingPending = await query<Array<{ id: number }>>(
      `SELECT id FROM store_applications WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );

    if (existingPending.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending store application under review." },
        { status: 400 }
      );
    }

    // Count existing active stores so the response can inform the UI
    const existingStoresResult = await query<Array<{ cnt: number }>>(
      `SELECT COUNT(*) AS cnt FROM store_users WHERE user_id = ? AND status = 'active'`,
      [userId]
    );
    const existingStoreCount = existingStoresResult[0]?.cnt ?? 0;

    const res = await query<{ insertId: number }>(
      `INSERT INTO store_applications (
        user_id, store_name, business_category, products_description, phone, email, additional_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        store_name.trim(),
        (business_category || "General").trim(),
        products_description.trim(),
        phone ? phone.trim() : null,
        email ? email.trim() : userEmail,
        additional_notes ? additional_notes.trim() : null,
      ]
    );

    // Notify admins
    await createAdminNotification({
      type: "store_application",
      title: "New Store Creation Application",
      body: `${userName} (${userEmail}) submitted an application for store '${store_name.trim()}'.`,
      link: "/admin/store-applications",
    });

    return NextResponse.json({
      success: true,
      message:
        existingStoreCount > 0
          ? `Additional store application submitted! You currently own ${existingStoreCount} active store(s).`
          : "Application submitted successfully!",
      id: res.insertId,
      existing_store_count: existingStoreCount,
    });
  } catch (error) {
    console.error("Error creating store application:", error);
    return NextResponse.json({ error: "Failed to submit store application" }, { status: 500 });
  }
}
