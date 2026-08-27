import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { z } from "zod";

const visitSchema = z.object({
  storeId: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = visitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id, 10) : null;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent") || undefined;

    await StoreRepository.recordStoreVisit(parsed.data.storeId, userId, ip, userAgent);

    return NextResponse.json({ success: true, recorded: true });
  } catch (err) {
    console.error("Store visit record error:", err);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
