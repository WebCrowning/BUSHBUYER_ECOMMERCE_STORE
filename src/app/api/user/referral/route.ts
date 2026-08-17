import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRepository } from "@/repositories/user.repository";
import { StoreRepository } from "@/repositories/store.repository";

/**
 * POST /api/user/referral
 * Body: { storeId: number }
 *
 * Called client-side when:
 *   a) The user is already authenticated and visits a store page, OR
 *   b) The ref_store_id cookie was not captured at auth time (e.g. JS not yet
 *      hydrated when the user immediately opened /signin).
 *
 * Only sets referred_by_store_id if the user does not already have one
 * (first-attribution-wins rule is enforced in the repository).
 *
 * Also returns the store slug so the caller can redirect if needed.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Not authenticated — nothing to do (attribution happens at sign-in)
      return NextResponse.json({ ok: false, reason: "not_authenticated" });
    }

    const body = await request.json().catch(() => null);
    const storeId = typeof body?.storeId === "number" ? body.storeId : parseInt(body?.storeId, 10);

    if (!storeId || isNaN(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "Invalid storeId" }, { status: 400 });
    }

    const userId = Number(session.user.id);

    // Check current state
    const user = await UserRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the store exists and is active
    const store = await StoreRepository.findById(storeId);
    if (!store || store.store_status !== "active") {
      return NextResponse.json({ ok: false, reason: "store_not_found" });
    }

    // Only update if not already attributed (first-attribution-wins)
    if (!user.referred_by_store_id) {
      await UserRepository.setReferredByStore(userId, storeId);
      return NextResponse.json({
        ok: true,
        attributed: true,
        storeSlug: store.slug,
        storeName: store.name,
      });
    }

    // Already attributed — still return the current store slug for redirect use
    const currentStore = await StoreRepository.findById(user.referred_by_store_id);
    return NextResponse.json({
      ok: true,
      attributed: false,
      storeSlug: currentStore?.slug ?? null,
      storeName: currentStore?.name ?? null,
    });
  } catch (err) {
    console.error("POST /api/user/referral error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/user/referral
 * Returns the current user's referred store info (slug + name).
 * Used by StoreAttributor to know if a redirect is warranted.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ referredStoreSlug: null, referredStoreName: null });
    }

    const userId = Number(session.user.id);
    const user = await UserRepository.findById(userId);

    if (!user?.referred_by_store_id) {
      return NextResponse.json({ referredStoreSlug: null, referredStoreName: null });
    }

    const store = await StoreRepository.findById(user.referred_by_store_id);
    return NextResponse.json({
      referredStoreSlug: store?.slug ?? null,
      referredStoreName: store?.name ?? null,
    });
  } catch (err) {
    console.error("GET /api/user/referral error:", err);
    return NextResponse.json({ referredStoreSlug: null, referredStoreName: null });
  }
}
