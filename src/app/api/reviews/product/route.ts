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
    const { productId, orderId, rating, reviewText } = body;

    const pId = Number(productId);
    const numRating = Number(rating);

    if (!Number.isInteger(pId) || pId <= 0) {
      return NextResponse.json({ error: "Valid product ID is required" }, { status: 400 });
    }

    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }

    // Find product to get store_id
    const [product] = await query<any[]>(
      "SELECT id, store_id FROM products WHERE id = ? LIMIT 1",
      [pId]
    );
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const oId = orderId ? Number(orderId) : undefined;

    // Check verified purchase
    const isPurchased = await ReviewRepository.verifyProductPurchase(pId, userId, oId);
    if (!isPurchased) {
      return NextResponse.json(
        { error: "Only verified buyers who purchased this product can leave a review." },
        { status: 403 }
      );
    }

    const reviewId = await ReviewRepository.createProductReview({
      productId: pId,
      storeId: product.store_id,
      customerId: userId,
      orderId: oId,
      rating: numRating,
      reviewText: typeof reviewText === "string" ? reviewText : "",
    });

    const stats = await ReviewRepository.getProductReviewStats(pId);

    return NextResponse.json({
      success: true,
      message: "Product review submitted successfully! Thank you for your feedback.",
      reviewId,
      stats,
    });
  } catch (err: any) {
    console.error("Product review submission error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = Number(searchParams.get("productId"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "Valid product ID required" }, { status: 400 });
    }

    const [reviews, stats] = await Promise.all([
      ReviewRepository.listProductReviews(productId, limit, offset),
      ReviewRepository.getProductReviewStats(productId),
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      stats,
    });
  } catch (err: any) {
    console.error("Product review GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
