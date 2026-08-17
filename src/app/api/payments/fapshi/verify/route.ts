import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";

/**
 * GET /api/payments/fapshi/verify?transId=...
 * Server-side Fapshi transaction status check.
 * Called from the /checkout/fapshi-success page after redirect.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transId = searchParams.get("transId");

    if (!transId) {
      return NextResponse.json({ error: "transId is required" }, { status: 400 });
    }

    const status = await PaymentService.verifyFapshiTransaction(transId);

    return NextResponse.json({
      transId: status.transId,
      status: status.status,
      amount: status.amount,
      currency: status.currency,
      externalId: status.externalId,
      confirmed: status.status === "SUCCESSFUL",
    });
  } catch (err: any) {
    console.error("[Fapshi Verify] Error:", err);
    return NextResponse.json(
      { error: "Failed to verify transaction status" },
      { status: 500 }
    );
  }
}
