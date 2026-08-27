import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const storeIdsParam = searchParams.get("ids");

    let visitedStores: { store: any; visit_count: number; last_visited_at: string }[] = [];

    if (session?.user?.id) {
      const userId = parseInt(session.user.id, 10);
      visitedStores = await StoreRepository.getUserVisitedStores(userId, 40);
    } else if (storeIdsParam) {
      // Fallback for anonymous user via client localStorage IDs
      const rawIds = storeIdsParam
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id) && id > 0)
        .slice(0, 30);

      if (rawIds.length > 0) {
        const stores = await StoreRepository.getStoresByIds(rawIds);
        visitedStores = stores.map((s) => ({
          store: s,
          visit_count: 1,
          last_visited_at: new Date().toISOString(),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      visitedStores,
    });
  } catch (err) {
    console.error("Fetch visited stores error:", err);
    return NextResponse.json({ error: "Failed to fetch visited stores" }, { status: 500 });
  }
}
