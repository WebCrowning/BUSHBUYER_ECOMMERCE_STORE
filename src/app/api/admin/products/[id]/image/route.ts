import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { toId } from "@/lib/utils";
import { requireStoreOrAdminApi } from "@/lib/authz";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const productId = toId(id);
  if (!productId) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  // For non-super admins, verify the product belongs to their store and is not global index catalog (0)
  if (!access.isSuperAdmin) {
    const existing = await query<Array<{ store_id: number }>>(
      "SELECT store_id FROM products WHERE id = ?",
      [productId]
    );
    if (!existing.length || existing[0].store_id === 0 || !access.userStoreIds.includes(existing[0].store_id)) {
      return NextResponse.json({ error: "Forbidden: Store roles can only manage items in their specified store" }, { status: 403 });
    }
  }

  const payload = (await request.json().catch(() => null)) as
    | { image?: string; imageZoom?: number }
    | null;
  const image = payload?.image?.trim();
  const imageZoom = payload?.imageZoom;

  if (!image && typeof imageZoom !== "number") {
    return NextResponse.json({ error: "Image or image zoom is required" }, { status: 400 });
  }

  if (image && !image.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  }

  if (typeof imageZoom === "number" && (!Number.isInteger(imageZoom) || imageZoom < 80 || imageZoom > 180)) {
    return NextResponse.json({ error: "Image zoom must be an integer between 80 and 180" }, { status: 400 });
  }

  try {
    if (image && typeof imageZoom === "number") {
      await query("UPDATE products SET image = ?, image_zoom = ? WHERE id = ?", [image, imageZoom, productId]);
    } else if (image) {
      await query("UPDATE products SET image = ? WHERE id = ?", [image, productId]);
    } else {
      await query("UPDATE products SET image_zoom = ? WHERE id = ?", [imageZoom, productId]);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update product image settings" }, { status: 500 });
  }
}
