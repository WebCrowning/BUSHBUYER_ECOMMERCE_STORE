import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { SettingsRepository } from "@/repositories/settings.repository";

/**
 * GET /api/admin/registration-settings
 * Returns the current store registration fee. Admin only.
 */
export async function GET() {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const fee_cfa = await SettingsRepository.getRegistrationFee();
    return NextResponse.json({ success: true, fee_cfa });
  } catch (err) {
    console.error("Admin registration-settings GET error:", err);
    return NextResponse.json({ error: "Failed to fetch registration fee" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/registration-settings
 * Updates the store registration fee. Admin only.
 * Body: { fee_cfa: number }
 */
export async function PUT(req: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.fee_cfa;
    const feeCfa = Number(raw);

    if (!Number.isFinite(feeCfa) || feeCfa < 100) {
      return NextResponse.json(
        { error: "fee_cfa must be a number ≥ 100 CFA" },
        { status: 400 }
      );
    }

    const adminId = Number(access.session.user.id);
    const updated = await SettingsRepository.updateRegistrationFee(feeCfa, adminId);

    return NextResponse.json({
      success: true,
      fee_cfa: updated,
      message: `Registration fee updated to ${updated.toLocaleString()} CFA`,
    });
  } catch (err) {
    console.error("Admin registration-settings PUT error:", err);
    return NextResponse.json({ error: "Failed to update registration fee" }, { status: 500 });
  }
}
