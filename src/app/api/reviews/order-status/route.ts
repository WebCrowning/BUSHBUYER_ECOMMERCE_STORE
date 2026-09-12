import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReviewRepository } from "@/repositories/review.repository";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(req.url);
    const orderId = Number(searchParams.get("orderId"));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Valid order ID required" }, { status: 400 });
    }

    const data = await ReviewRepository.getOrderReviewsForUser(orderId, userId);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error("Order review status GET error:", err);
    return NextResponse.json({ error: "Failed to fetch review status" }, { status: 500 });
  }
}
