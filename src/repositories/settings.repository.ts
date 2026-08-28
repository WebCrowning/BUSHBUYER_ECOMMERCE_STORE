import { query } from "@/lib/db";
import { WithdrawalSystemSettings } from "@/types/withdrawal";

export class SettingsRepository {
  /**
   * Fetch all withdrawal-related system settings.
   * Guaranteed fallback to safe defaults (MANUAL mode).
   */
  static async getWithdrawalSettings(): Promise<WithdrawalSystemSettings> {
    const rows = await query<{ setting_key: string; setting_value: string }[]>(
      "SELECT setting_key, setting_value FROM system_settings"
    );

    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.setting_key, r.setting_value);
    }

    const mode = map.get("withdrawal_mode")?.toUpperCase();

    return {
      // CRITICAL: Defaults strictly to MANUAL
      withdrawal_mode: mode === "AUTO" ? "AUTO" : "MANUAL",
      min_withdrawal_amount: Number(map.get("min_withdrawal_amount") ?? 500),
      max_withdrawal_amount: Number(map.get("max_withdrawal_amount") ?? 500000),
      withdrawal_fee_fixed: Number(map.get("withdrawal_fee_fixed") ?? 0),
      withdrawal_fee_percentage: Number(map.get("withdrawal_fee_percentage") ?? 0),
      auto_max_amount: Number(map.get("auto_max_amount") ?? 50000),
      daily_user_limit: Number(map.get("daily_user_limit") ?? 100000),
      daily_global_limit: Number(map.get("daily_global_limit") ?? 1000000),
    };
  }

  /**
   * Update withdrawal settings with audit logging.
   */
  static async updateWithdrawalSettings(
    newSettings: Partial<WithdrawalSystemSettings>,
    adminUserId: number,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<WithdrawalSystemSettings> {
    const current = await this.getWithdrawalSettings();

    for (const [k, v] of Object.entries(newSettings)) {
      if (v === undefined || v === null) continue;
      const strVal = String(v);

      await query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [k, strVal, adminUserId]
      );
    }

    const updated = await this.getWithdrawalSettings();

    // Record audit log for settings change
    await query(
      `INSERT INTO withdrawal_audit_logs (actor_id, actor_role, action, metadata_json, ip_address, user_agent)
       VALUES (?, 'admin', 'WITHDRAWAL_SETTINGS_CHANGED', ?, ?, ?)`,
      [
        adminUserId,
        JSON.stringify({
          previous: current,
          updated,
          reason: reason || "Admin updated withdrawal settings",
        }),
        ipAddress || null,
        userAgent || null,
      ]
    );

    return updated;
  }
}
