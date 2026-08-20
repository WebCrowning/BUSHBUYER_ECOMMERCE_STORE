import { NextResponse } from "next/server";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { StoreRepository } from "@/repositories/store.repository";
import { query } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireStoreOrAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;
    const storeId = parseInt(id, 10);
    if (isNaN(storeId)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    // Verify user has permission for this specific store (is super admin or store staff/owner)
    const isAuthorized = access.isSuperAdmin || access.userStoreIds.includes(storeId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Not authorized for this store" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body required" }, { status: 400 });
    }

    // Handle clearing banner if explicitly passed as empty string or null
    if (body.banner === "" || body.banner === null) {
      await query("UPDATE stores SET banner = NULL WHERE id = ?", [storeId]);
      delete body.banner;
    }

    // Update remaining properties if provided
    if (Object.keys(body).length > 0) {
      await StoreRepository.updateStore(storeId, body);
    }

    const updatedStore = await StoreRepository.findById(storeId);
    return NextResponse.json({ success: true, store: updatedStore });
  } catch (err) {
    console.error("Error updating store profile:", err);
    return NextResponse.json({ error: "Failed to update store profile" }, { status: 500 });
  }
}
