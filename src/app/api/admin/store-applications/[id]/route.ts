import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";
import { StoreRepository } from "@/repositories/store.repository";
import { createUserNotification } from "@/lib/notifications";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApi();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const appId = Number(id);

    if (!Number.isInteger(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }

    const body = await req.json();
    const { action, admin_notes } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    // Fetch existing application
    const rows = await query<
      Array<{
        id: number;
        user_id: number;
        store_name: string;
        business_category: string;
        products_description: string;
        phone: string | null;
        email: string | null;
        additional_notes: string | null;
        status: "pending" | "approved" | "rejected";
      }>
    >("SELECT * FROM store_applications WHERE id = ? LIMIT 1", [appId]);

    const app = rows[0];
    if (!app) {
      return NextResponse.json({ error: "Store application not found" }, { status: 404 });
    }

    if (action === "approve") {
      if (app.status === "approved") {
        return NextResponse.json({ error: "Application is already approved" }, { status: 400 });
      }

      // Generate a unique slug
      let baseSlug = slugify(app.store_name) || `store-${appId}`;
      let finalSlug = baseSlug;
      let counter = 1;

      while (await StoreRepository.findBySlug(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create Store
      const newStore = await StoreRepository.createStore({
        name: app.store_name,
        slug: finalSlug,
        business_category: app.business_category || "General",
        description: app.products_description,
        email: app.email || null,
        phone: app.phone || null,
      });

      // Grant User access to Store
      await StoreRepository.assignUserToStore(newStore.id, app.user_id, "store_owner");

      // Update User role to seller if currently default user
      await query(
        `UPDATE users SET role = 'seller' WHERE id = ? AND role = 'user'`,
        [app.user_id]
      );

      // Update Application status
      await query(
        `UPDATE store_applications SET status = 'approved', admin_notes = ? WHERE id = ?`,
        [admin_notes ? admin_notes.trim() : "Approved by administrator", appId]
      );

      // Send Platform Notification to User
      await createUserNotification(app.user_id, {
        type: "store_application",
        title: "Store Created & Access Granted!",
        body: `Congratulations! Your store application for '${app.store_name}' was approved and created. You can now manage your store.`,
        link: "/seller/dashboard",
      });

      return NextResponse.json({
        success: true,
        message: `Store '${app.store_name}' created and granted to user successfully!`,
        store: newStore,
      });
    }

    if (action === "reject") {
      // Update Application status
      const rejectionReason = admin_notes ? admin_notes.trim() : "Does not meet requirements.";
      await query(
        `UPDATE store_applications SET status = 'rejected', admin_notes = ? WHERE id = ?`,
        [rejectionReason, appId]
      );

      // Send Platform Notification to User
      await createUserNotification(app.user_id, {
        type: "store_application",
        title: "Store Application Update",
        body: `Your store application for '${app.store_name}' was rejected. Reason: ${rejectionReason}`,
        link: "/store/apply",
      });

      return NextResponse.json({
        success: true,
        message: `Application for '${app.store_name}' rejected and user notified.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing store application action:", error);
    return NextResponse.json({ error: "Failed to process store application" }, { status: 500 });
  }
}
