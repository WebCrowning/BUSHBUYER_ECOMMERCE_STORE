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

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user?.id || !isAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const stores = await StoreRepository.listStores(status, limit, offset);

    // Get total count
    const countRows = await query<{ total: number }[]>(
      status
        ? "SELECT COUNT(*) AS total FROM stores WHERE store_status = ?"
        : "SELECT COUNT(*) AS total FROM stores",
      status ? [status] : []
    );
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({
      stores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin stores GET error:", err);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    // Only super_admin and admin can create stores
    if (!session?.user?.id || !isAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.slug) {
      return NextResponse.json({ error: "Store name and slug are required" }, { status: 400 });
    }

    // Ensure slug is unique
    const existing = await query<{ id: number }[]>(
      "SELECT id FROM stores WHERE slug = ? LIMIT 1",
      [body.slug]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }

    const store = await StoreRepository.createStore(body);
    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error("Admin stores POST error:", err);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}
