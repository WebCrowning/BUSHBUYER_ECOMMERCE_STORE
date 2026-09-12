import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { SettingsRepository } from "@/repositories/settings.repository";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await req.json().catch(() => ({}));
    const { applicationId } = body;

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
        payment_reference: string | null;
      }>
    >("SELECT * FROM store_applications WHERE id = ? AND user_id = ? LIMIT 1", [appId, userId]);

    if (!app) {
      return NextResponse.json({ error: "Store application not found" }, { status: 404 });
    }

    if (app.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Application fee has already been verified and paid.",
        payment_status: "paid",
      });
    }

    // Use the snapshotted fee from the application row; fall back to the current platform setting
    const snapshotFee = Number(app.application_fee_cfa);
    const feeCfa = snapshotFee > 0 ? snapshotFee : await SettingsRepository.getRegistrationFee();

    const externalId = `STORE-APP-${app.id}-${Date.now()}`;
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const redirectUrl = `${baseUrl}/store/apply?appId=${app.id}&externalId=${externalId}`;

    // Initiate REAL Fapshi Mobile Money Payment
    const fapshiRes = await FapshiProvider.initiate({
      amount: feeCfa,
      email: session.user.email || "customer@bushbuyer.com",
      externalId,
      redirectUrl,
      message: `Bushbuyer Store Registration Fee (${feeCfa.toLocaleString()} CFA) for ${app.store_name}`,
    });

    if (!fapshiRes?.link) {
      return NextResponse.json(
        { error: "Fapshi did not return a valid payment link. Please try again." },
        { status: 502 }
      );
    }

    // Store the Fapshi transaction ID against the application for verification
    await query(
      `UPDATE store_applications
       SET payment_reference = ?,
           payment_gateway = 'fapshi',
           payment_status = 'pending'
       WHERE id = ?`,
      [fapshiRes.transId || externalId, appId]
    );

    return NextResponse.json({
      success: true,
      paymentUrl: fapshiRes.link,
      transId: fapshiRes.transId,
      externalId,
      fee_cfa: feeCfa,
      payment_status: "pending",
    });
  } catch (err: any) {
    console.error("Store application payment initiation error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to initiate payment gateway" },
      { status: 500 }
    );
  }
}
