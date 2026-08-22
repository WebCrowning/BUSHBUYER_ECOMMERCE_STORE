import { NextResponse } from "next/server";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { StoreRepository } from "@/repositories/store.repository";
import { query } from "@/lib/db";
import { z } from "zod";

const storeLocationSchema = z.object({
  storeId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  gps_coordinates: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  quarter: z.string().max(120).nullable().optional(),
  landmark: z.string().max(190).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  country: z.string().max(80).optional().default("Cameroon"),
});

export async function POST(request: Request) {
  try {
    const access = await requireStoreOrAdminApi();
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    const parsed = storeLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid location payload" },
        { status: 400 }
      );
    }

    const { storeId, latitude, longitude, city, quarter, landmark, address, country } = parsed.data;

    // Verify user authorization for this store
    const isAuthorized = access.isSuperAdmin || access.userStoreIds.includes(storeId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to update this store" },
        { status: 403 }
      );
    }

    const gpsCoords =
      parsed.data.gps_coordinates ||
      (latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined
        ? `${latitude}, ${longitude}`
        : null);

    await query(
      `UPDATE stores SET
         latitude = ?,
         longitude = ?,
         gps_coordinates = ?,
         city = COALESCE(?, city),
         quarter = COALESCE(?, quarter),
         landmark = COALESCE(?, landmark),
         address = COALESCE(?, address),
         country = COALESCE(?, country)
       WHERE id = ?`,
      [latitude ?? null, longitude ?? null, gpsCoords, city ?? null, quarter ?? null, landmark ?? null, address ?? null, country ?? "Cameroon", storeId]
    );

    const updated = await StoreRepository.findById(storeId);
    return NextResponse.json({
      success: true,
      message: "Store GPS location successfully updated",
      store: updated,
    });
  } catch (err) {
    console.error("Seller store location update error:", err);
    return NextResponse.json({ error: "Failed to update store location" }, { status: 500 });
  }
}
