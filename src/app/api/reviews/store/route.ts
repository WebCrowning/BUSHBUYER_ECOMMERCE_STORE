import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { ReviewRepository } from "@/repositories/review.repository";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to submit a review" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await req.json().catch(() => ({}));
    const { storeId, rating, reviewText } = body;

    const sId = Number(storeId);
    const numRating = Number(rating);

    if (!Number.isInteger(sId) || sId <= 0) {
      return NextResponse.json({ error: "Valid store ID is required" }, { status: 400 });
    }

    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }

    // Verify customer has ordered from this store
    const orders = await query<any[]>(
      "SELECT id FROM orders WHERE store_id = ? AND (user_id = ? OR customer_email = ?) LIMIT 1",
      [sId, userId, session.user.email || ""]
    );

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Only customers who have placed an order with this store can submit a store review." },
        { status: 403 }
      );
    }

    const reviewId = await ReviewRepository.createStoreReview({
      storeId: sId,
      customerId: userId,
      rating: numRating,
      reviewText: typeof reviewText === "string" ? reviewText : "",
    });

    return NextResponse.json({
      success: true,
      message: "Store review submitted successfully! Thank you for rating this store.",
      reviewId,
    });
  } catch (err: any) {
    console.error("Store review submission error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit store review" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = Number(searchParams.get("storeId"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    if (!Number.isInteger(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "Valid store ID required" }, { status: 400 });
    }

    const reviews = await ReviewRepository.listStoreReviews(storeId, limit, offset);

    return NextResponse.json({
      success: true,
      reviews,
    });
  } catch (err: any) {
    console.error("Store review GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch store reviews" },
      { status: 500 }
    );
  }
}
