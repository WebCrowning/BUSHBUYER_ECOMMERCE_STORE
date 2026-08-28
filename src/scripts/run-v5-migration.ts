import fs from "fs";
import path from "path";

// Load .env.local manually before anything else
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env.local:", e);
}

if (!process.env.MYSQL_DATABASE) {
  process.env.MYSQL_DATABASE = "bushfaller";
}

async function main() {
  const { query } = await import("@/lib/db");

  console.log(`Connecting to database: ${process.env.MYSQL_DATABASE}`);

  // 1. Create system_settings table
  console.log("1. Creating system_settings table...");
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      description VARCHAR(255) NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_settings_key (setting_key)
    )
  `);

  // Seed default settings (CRITICAL: Default withdrawal_mode is strictly MANUAL)
  console.log("Seeding system_settings...");
  const defaultSettings = [
    ["withdrawal_mode", "MANUAL", "Withdrawal execution mode: MANUAL (admin approval required) or AUTO (automatic Fapshi payout)"],
    ["min_withdrawal_amount", "500", "Minimum withdrawal amount in currency units (e.g., 500 XAF)"],
    ["max_withdrawal_amount", "500000", "Maximum single withdrawal amount in currency units (e.g., 500,000 XAF)"],
    ["withdrawal_fee_fixed", "0", "Fixed fee deducted from withdrawal amount"],
    ["withdrawal_fee_percentage", "0", "Percentage fee deducted from withdrawal amount (e.g., 1.5 for 1.5%)"],
    ["auto_max_amount", "50000", "Maximum allowed single withdrawal for automatic payout when AUTO mode is enabled"],
    ["daily_user_limit", "100000", "Maximum total automatic payout allowed per user per 24 hours"],
    ["daily_global_limit", "1000000", "Maximum total automatic payout allowed across the platform per 24 hours"],
  ];

  for (const [k, v, desc] of defaultSettings) {
    await query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [k, v, desc]
    );
  }

  // 2. Upgrade withdrawals table columns
  console.log("2. Upgrading withdrawals table...");
  const columnsToAdd = [
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee DECIMAL(12,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XAF'",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(40) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(190) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fapshi_reference VARCHAR(120) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fapshi_transaction_id VARCHAR(120) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL",
    "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "ALTER TABLE withdrawals MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PENDING'",
  ];

  for (const sql of columnsToAdd) {
    try {
      await query(sql);
    } catch (e: any) {
      console.warn("Column migration notice:", e.message);
    }
  }

  // Add indexes safely
  const indexQueries = [
    "CREATE INDEX idx_w_fapshi_ref ON withdrawals (fapshi_reference)",
    "CREATE INDEX idx_w_fapshi_trans ON withdrawals (fapshi_transaction_id)",
    "CREATE UNIQUE INDEX idx_w_idempotency ON withdrawals (idempotency_key)",
  ];

  for (const idxSql of indexQueries) {
    try {
      await query(idxSql);
    } catch (e: any) {
      // index already exists or notice
    }
  }

  // 3. Create withdrawal_audit_logs table
  console.log("3. Creating withdrawal_audit_logs table...");
  await query(`
    CREATE TABLE IF NOT EXISTS withdrawal_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      withdrawal_id INT NULL,
      actor_id INT NULL,
      actor_role VARCHAR(50) NOT NULL DEFAULT 'system',
      action VARCHAR(100) NOT NULL,
      old_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      amount DECIMAL(12,2) NULL,
      metadata_json LONGTEXT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_withdrawal (withdrawal_id),
      INDEX idx_audit_actor (actor_id),
      INDEX idx_audit_action (action)
    )
  `);

  // Verify system_settings
  const settings = await query<any[]>("SELECT * FROM system_settings");
  console.log("System Settings successfully verified:", settings.map((s) => ({ key: s.setting_key, val: s.setting_value })));

  console.log("✅ V5 Secure Fapshi Payout migration finished successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
