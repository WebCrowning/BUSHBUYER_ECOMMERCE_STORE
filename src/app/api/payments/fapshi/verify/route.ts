import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";

/**
 * GET /api/payments/fapshi/verify?transId=...
 * Server-side Fapshi transaction status check.
 * Called from the /checkout/fapshi-success page after redirect.
 */
export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  const rl = checkRateLimit({ key: `fapshi-verify:${clientIp}`, windowMs: 60_000, maxRequests: 30 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many verification requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

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
