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
  is_validated: z.boolean().optional().default(false),
  accuracy: z.number().nullable().optional(),
  verification_method: z.string().max(50).optional().default("gps_live"),
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

    const {
      storeId,
      latitude,
      longitude,
      city,
      quarter,
      landmark,
      address,
      country,
      is_validated,
      accuracy,
      verification_method,
    } = parsed.data;

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

    const hasValidCoords = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;
    const shouldVerify = is_validated && hasValidCoords;

    if (shouldVerify) {
      await query(
        `UPDATE stores SET
           latitude = ?,
           longitude = ?,
           gps_coordinates = ?,
           city = COALESCE(?, city),
           quarter = COALESCE(?, quarter),
           landmark = COALESCE(?, landmark),
           address = COALESCE(?, address),
           country = COALESCE(?, country),
           is_location_verified = 1,
           location_verified_at = NOW(),
           location_accuracy_meters = ?,
           location_verification_method = ?
         WHERE id = ?`,
        [
          latitude ?? null,
          longitude ?? null,
          gpsCoords,
          city ?? null,
          quarter ?? null,
          landmark ?? null,
          address ?? null,
          country ?? "Cameroon",
          accuracy ? Math.round(accuracy) : null,
          verification_method || "gps_live",
          storeId,
        ]
      );
    } else {
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
        [
          latitude ?? null,
          longitude ?? null,
          gpsCoords,
          city ?? null,
          quarter ?? null,
          landmark ?? null,
          address ?? null,
          country ?? "Cameroon",
          storeId,
        ]
      );
    }

    const updated = await StoreRepository.findById(storeId);
    return NextResponse.json({
      success: true,
      message: shouldVerify
        ? "Store GPS location successfully validated and verified!"
        : "Store GPS location successfully updated",
      store: updated,
    });
  } catch (err) {
    console.error("Seller store location update error:", err);
    return NextResponse.json({ error: "Failed to update store location" }, { status: 500 });
  }
}
