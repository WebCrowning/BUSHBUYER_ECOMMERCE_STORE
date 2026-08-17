const mysql = require("mysql2/promise");

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
    multipleStatements: true,
  });

  try {
    const steps = [
      ["withdrawals.processed_by",      "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_by INT NULL"],
      ["withdrawals.admin_notes",        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL"],
      ["withdrawals.payout_reference",   "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_reference VARCHAR(120) NULL"],
      ["commissions.holding_period_days","ALTER TABLE commissions ADD COLUMN IF NOT EXISTS holding_period_days INT NOT NULL DEFAULT 0"],
      ["commissions.updated_at",         "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP"],
      ["commissions.updated_by",         "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS updated_by INT NULL"],
      ["wallet_transactions.admin_note", "ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS admin_note TEXT NULL"],
    ];

    for (const [label, sql] of steps) {
      try { await conn.execute(sql); console.log(`OK: ${label}`); }
      catch (e) { console.log(`Skipped ${label}: ${e.message}`); }
    }

    // Add indexes if missing
    const indexes = [
      ["payment_transactions", "idx_pt_store_id",          "CREATE INDEX idx_pt_store_id ON payment_transactions (store_id)"],
      ["orders",               "idx_orders_master_order_id","CREATE INDEX idx_orders_master_order_id ON orders (master_order_id)"],
    ];

    for (const [table, idxName, sql] of indexes) {
      const [rows] = await conn.execute(
        "SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [table, idxName]
      );
      if (rows[0].c === 0) {
        try { await conn.execute(sql); console.log(`OK: index ${idxName}`); }
        catch (e) { console.log(`Index ${idxName} skipped: ${e.message}`); }
      } else {
        console.log(`Index ${idxName} already exists`);
      }
    }

    console.log("\nMigration complete.");
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error("Migration failed:", e.message); process.exit(1); });
