import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PaymentRepository } from "@/repositories/payment.repository";

function isFinanceAdmin(role?: string) {
  return (
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "finance_admin"
  );
}

/**
 * GET /api/admin/payments/dashboard
 * Super Admin / Finance Admin financial overview.
 */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || !isFinanceAdmin(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await PaymentRepository.getPaymentDashboardStats();

    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error("[Admin Payments Dashboard] Error:", err);
    return NextResponse.json(
      { error: "Failed to load payment dashboard stats" },
      { status: 500 }
    );
  }
}
