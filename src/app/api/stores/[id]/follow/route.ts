import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isFollowing: false, count: 0 });
    }
    const { id } = await params;
    const storeIdNum = parseInt(id, 10);
    if (isNaN(storeIdNum)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    const userId = parseInt(session.user.id, 10);
    const isFollowing = await StoreRepository.isFollowing(storeIdNum, userId);
    const store = await StoreRepository.findById(storeIdNum);

    return NextResponse.json({
      isFollowing,
      followersCount: store?.followers_count ?? 0,
    });
  } catch (err) {
    console.error("Follow GET error:", err);
    return NextResponse.json({ error: "Failed to fetch follow status" }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const storeIdNum = parseInt(id, 10);
    if (isNaN(storeIdNum)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    const userId = parseInt(session.user.id, 10);
    await StoreRepository.followStore(storeIdNum, userId);

    const store = await StoreRepository.findById(storeIdNum);
    return NextResponse.json({
      isFollowing: true,
      followersCount: store?.followers_count ?? 0,
    });
  } catch (err) {
    console.error("Follow POST error:", err);
    return NextResponse.json({ error: "Failed to follow store" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const storeIdNum = parseInt(id, 10);
    if (isNaN(storeIdNum)) return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });

    const userId = parseInt(session.user.id, 10);
    await StoreRepository.unfollowStore(storeIdNum, userId);

    const store = await StoreRepository.findById(storeIdNum);
    return NextResponse.json({
      isFollowing: false,
      followersCount: store?.followers_count ?? 0,
    });
  } catch (err) {
    console.error("Follow DELETE error:", err);
    return NextResponse.json({ error: "Failed to unfollow store" }, { status: 500 });
  }
}
