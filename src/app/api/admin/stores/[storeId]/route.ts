import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { query } from "@/lib/db";

function isAdmin(role?: string) {
  return (
    role === "admin" ||
    role === "sub_admin" ||
    role === "super_admin" ||
    role === "platform_admin"
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user?.id || !isAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Request body required" }, { status: 400 });
    }

    await StoreRepository.updateStore(id, body);
    const updated = await StoreRepository.findById(id);
    return NextResponse.json({ store: updated });
  } catch (err) {
    console.error("Admin store PATCH error:", err);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    // Only super_admin can delete stores
    if (!session?.user?.id || (role !== "super_admin" && role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { storeId } = await params;
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    await query("DELETE FROM stores WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin store DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
