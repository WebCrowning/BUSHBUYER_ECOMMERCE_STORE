import { auth } from "@/auth";
import { DeliveryRepository } from "@/repositories/delivery.repository";
import { DeliveryService } from "@/services/delivery.service";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storeId = Number(id);

    if (isNaN(storeId) || storeId <= 0) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const methods = await DeliveryRepository.getStoreDeliveryMethods(storeId);
    return NextResponse.json({ methods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch delivery methods" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const storeId = Number(id);
    const body = await req.json();
    const { delivery_method_id, enabled, is_default, configuration } = body;

    if (!delivery_method_id) {
      return NextResponse.json({ error: "delivery_method_id is required" }, { status: 400 });
    }

    await DeliveryService.updateStoreDeliveryConfig(
      Number(session.user.id),
      storeId,
      Number(delivery_method_id),
      Boolean(enabled),
      Boolean(is_default),
      configuration
    );

    const updatedMethods = await DeliveryRepository.getStoreDeliveryMethods(storeId);
    return NextResponse.json({ success: true, methods: updatedMethods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update delivery settings" }, { status: 500 });
  }
}
