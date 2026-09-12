import { NextResponse } from "next/server";
import { SettingsRepository } from "@/repositories/settings.repository";

/**
 * GET /api/registration-fee
 * Public endpoint — returns the current store registration fee so the
 * apply page can display the correct amount without requiring auth.
 */
export async function GET() {
  try {
    const fee_cfa = await SettingsRepository.getRegistrationFee();
    return NextResponse.json({ fee_cfa });
  } catch (err) {
    console.error("Registration fee GET error:", err);
    // Always return a safe fallback so the UI never breaks
    return NextResponse.json({ fee_cfa: 5000 });
  }
}
