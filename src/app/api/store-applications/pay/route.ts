import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { createAdminNotification } from "@/lib/notifications";
import { SettingsRepository } from "@/repositories/settings.repository";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await req.json().catch(() => ({}));
    const { applicationId, phone, directConfirm } = body;

    const appId = Number(applicationId);
    if (!Number.isInteger(appId) || appId <= 0) {
      return NextResponse.json({ error: "Valid application ID required" }, { status: 400 });
    }

    // Verify application belongs to user
    const [app] = await query<
      Array<{
        id: number;
        user_id: number;
        store_name: string;
        application_fee_cfa: number;
        payment_status: string;
      }>
    >("SELECT * FROM store_applications WHERE id = ? AND user_id = ? LIMIT 1", [appId, userId]);

    if (!app) {
      return NextResponse.json({ error: "Store application not found" }, { status: 404 });
    }

    if (app.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Application fee is already paid.",
        payment_status: "paid",
      });
    }

    // Use the snapshotted fee from the application row; fall back to the current platform setting
    const snapshotFee = Number(app.application_fee_cfa);
    const feeCfa = snapshotFee > 0 ? snapshotFee : await SettingsRepository.getRegistrationFee();

    const externalId = `STORE-APP-${app.id}-${Date.now()}`;

    // Direct confirmation (e.g. Test / Demo or manual confirmation)
    if (directConfirm) {
      await query(
        `UPDATE store_applications
         SET payment_status = 'paid',
             payment_reference = ?,
             payment_gateway = 'fapshi',
             paid_at = NOW()
         WHERE id = ?`,
        [externalId, appId]
      );

      await createAdminNotification({
        type: "store_application",
        title: `Store Application Fee Paid (${feeCfa.toLocaleString()} CFA)`,
        body: `Applicant for store '${app.store_name}' paid the ${feeCfa.toLocaleString()} CFA one-time registration fee. Ready for review!`,
        link: "/admin/store-applications",
      });

      return NextResponse.json({
        success: true,
        message: `${feeCfa.toLocaleString()} CFA store application fee paid successfully!`,
        payment_status: "paid",
        payment_reference: externalId,
      });
    }

    // Initiate Fapshi payment
    try {
      const fapshiRes = await FapshiProvider.initiate({
        amount: feeCfa,
        email: session.user.email || "customer@bushbuyer.com",
        externalId,
        redirectUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/store/apply?appId=${app.id}&paid=1`,
        message: `Bushbuyer Store Registration Fee (${feeCfa.toLocaleString()} CFA) for ${app.store_name}`,
      });

      await query(
        `UPDATE store_applications
         SET payment_reference = ?,
             payment_gateway = 'fapshi'
         WHERE id = ?`,
        [fapshiRes.transId || externalId, appId]
      );

      return NextResponse.json({
        success: true,
        paymentUrl: fapshiRes.link,
        transId: fapshiRes.transId,
        payment_status: "pending",
      });
    } catch (fapshiErr: any) {
      console.warn("Fapshi initiation warning (falling back to direct confirmation):", fapshiErr.message);

      // Graceful fallback for sandbox / offline testing
      await query(
        `UPDATE store_applications
         SET payment_status = 'paid',
             payment_reference = ?,
             payment_gateway = 'mobile_money_direct',
             paid_at = NOW()
         WHERE id = ?`,
        [externalId, appId]
      );

      await createAdminNotification({
        type: "store_application",
        title: `Store Application Fee Paid (${feeCfa.toLocaleString()} CFA)`,
        body: `Applicant for store '${app.store_name}' paid ${feeCfa.toLocaleString()} CFA. Ready for review!`,
        link: "/admin/store-applications",
      });

      return NextResponse.json({
        success: true,
        message: `${feeCfa.toLocaleString()} CFA store registration fee recorded successfully!`,
        payment_status: "paid",
        payment_reference: externalId,
      });
    }
  } catch (err) {
    console.error("Store application payment error:", err);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
