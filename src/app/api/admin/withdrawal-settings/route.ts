import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { SettingsRepository } from "@/repositories/settings.repository";
import { z } from "zod";

const settingsSchema = z.object({
  withdrawal_mode: z.enum(["MANUAL", "AUTO"]),
  min_withdrawal_amount: z.number().min(0),
  max_withdrawal_amount: z.number().min(0),
  withdrawal_fee_fixed: z.number().min(0),
  withdrawal_fee_percentage: z.number().min(0).max(100),
  auto_max_amount: z.number().min(0),
  daily_user_limit: z.number().min(0),
  daily_global_limit: z.number().min(0),
  reason: z.string().max(300).optional(),
});

/**
 * GET /api/admin/withdrawal-settings
 * Returns current withdrawal system settings.
 */
export async function GET() {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const settings = await SettingsRepository.getWithdrawalSettings();
    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error("Admin withdrawal settings GET error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/withdrawal-settings
 * Updates withdrawal system settings (Super Admin / Admin only).
 */
export async function PUT(request: Request) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid configuration data" },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") || undefined;
  const adminUserId = Number(access.session.user.id);

  try {
    const updated = await SettingsRepository.updateWithdrawalSettings(
      parsed.data,
      adminUserId,
      ip,
      userAgent,
      parsed.data.reason
    );

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error("Admin withdrawal settings PUT error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
