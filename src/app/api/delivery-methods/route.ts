import { auth } from "@/auth";
import { DeliveryRepository } from "@/repositories/delivery.repository";
import { NextResponse } from "next/server";

// GET /api/delivery-methods - List all global delivery methods (admin)
export async function GET() {
  try {
    const methods = await DeliveryRepository.getAllGlobalMethods();
    return NextResponse.json({ methods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch delivery methods" }, { status: 500 });
  }
}

// POST /api/delivery-methods - Create a new global delivery method (super admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin or admin role can create global delivery methods
    const userRole = (session.user as any).role as string | undefined;
    if (!["super_admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    // Validate code format: lowercase_with_underscores
    if (!/^[a-z][a-z0-9_]{1,58}$/.test(code)) {
      return NextResponse.json(
        { error: "code must be lowercase letters, digits, and underscores only (e.g. express_delivery)" },
        { status: 400 }
      );
    }

    const created = await DeliveryRepository.createGlobalMethod(name, code, description);
    return NextResponse.json({ success: true, method: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A delivery method with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create delivery method" }, { status: 500 });
  }
}
