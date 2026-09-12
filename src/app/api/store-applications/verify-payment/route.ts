import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { createAdminNotification } from "@/lib/notifications";
import { SettingsRepository } from "@/repositories/settings.repository";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(req.url);
    const appId = Number(searchParams.get("appId") || searchParams.get("applicationId"));
    const transIdParam = searchParams.get("transId") || searchParams.get("trans_id") || "";

    if (!Number.isInteger(appId) || appId <= 0) {
      return NextResponse.json({ error: "Valid application ID required" }, { status: 400 });
    }

    // Check application belongs to user (or user is admin)
    const isAdmin = (session.user as any)?.role === "admin";
    const [app] = await query<
      Array<{
        id: number;
        user_id: number;
        store_name: string;
        application_fee_cfa: number;
        payment_status: string;
        payment_reference: string | null;
      }>
    >(
      isAdmin
        ? "SELECT * FROM store_applications WHERE id = ? LIMIT 1"
        : "SELECT * FROM store_applications WHERE id = ? AND user_id = ? LIMIT 1",
      isAdmin ? [appId] : [appId, userId]
    );

    if (!app) {
      return NextResponse.json({ error: "Store application not found" }, { status: 404 });
    }

    // If already verified paid, return immediate confirmation
    if (app.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        verified: true,
        payment_status: "paid",
        message: "Application fee is confirmed paid.",
      });
    }

    const effectiveTransId = (transIdParam || app.payment_reference || "").trim();
    if (!effectiveTransId) {
      return NextResponse.json({
        success: false,
        verified: false,
        payment_status: "pending",
        message: "No payment transaction reference found to verify.",
      });
    }

    // Check real status with Fapshi API
    const fapshiStatus = await FapshiProvider.verifyTransaction(effectiveTransId);

    const snapshotFee = Number(app.application_fee_cfa);
    const feeCfa = snapshotFee > 0 ? snapshotFee : await SettingsRepository.getRegistrationFee();

    if (fapshiStatus.status === "SUCCESSFUL") {
      // Mark as paid in DB
      await query(
        `UPDATE store_applications
         SET payment_status = 'paid',
             payment_reference = ?,
             payment_gateway = 'fapshi',
             paid_at = NOW()
         WHERE id = ?`,
        [effectiveTransId, appId]
      );

      // Create admin notification
      await createAdminNotification({
        type: "store_application",
        title: `Store Application Fee Paid (${feeCfa.toLocaleString()} CFA)`,
        body: `Applicant for store '${app.store_name}' completed the ${feeCfa.toLocaleString()} CFA registration fee via Fapshi Mobile Money. Ready for review!`,
        link: "/admin/store-applications",
      });

      return NextResponse.json({
        success: true,
        verified: true,
        payment_status: "paid",
        transId: effectiveTransId,
        amount: fapshiStatus.amount,
        message: `${feeCfa.toLocaleString()} CFA registration fee verified successfully! Your store application is now under admin review.`,
      });
    }

    const rawStatus = (fapshiStatus.status as string) || "";
    if (rawStatus === "CREATED" || rawStatus === "PENDING") {
      return NextResponse.json({
        success: true,
        verified: false,
        payment_status: "pending",
        status: fapshiStatus.status,
        message: "Payment prompt has been initiated. Please complete authorization on your phone.",
      });
    }

    // FAILED or EXPIRED
    await query(
      `UPDATE store_applications
       SET payment_status = 'failed'
       WHERE id = ? AND payment_status != 'paid'`,
      [appId]
    );

    return NextResponse.json({
      success: true,
      verified: false,
      payment_status: "failed",
      status: fapshiStatus.status,
      message: "Payment was not completed or has expired. Please try paying again.",
    });
  } catch (err: any) {
    console.error("Store application verification error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify payment with gateway" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Allow POST with body { applicationId, transId } by delegating to same logic
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  if (body.applicationId) url.searchParams.set("appId", String(body.applicationId));
  if (body.transId) url.searchParams.set("transId", String(body.transId));
  return GET(new Request(url.toString(), { headers: req.headers }));
}
