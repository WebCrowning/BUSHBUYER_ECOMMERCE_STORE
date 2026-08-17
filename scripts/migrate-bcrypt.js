/**
 * scripts/migrate-bcrypt.js
 * 
 * One-time migration: upgrades any existing SHA-256 admin password hashes to bcrypt.
 * Safe to re-run — skips accounts that already have bcrypt hashes.
 * 
 * Usage:
 *   node scripts/migrate-bcrypt.js
 * 
 * NOTE: This script CANNOT upgrade SHA-256 hashes to bcrypt automatically
 * because the original plaintext passwords are unknown. It will:
 *   1. Report which admin accounts still have SHA-256 hashes
 *   2. Tell you to run set-admin-password.js to reset them to bcrypt
 */

const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });

  try {
    const [admins] = await conn.execute(
      "SELECT id, email, password_hash FROM users WHERE role IN ('admin','sub_admin','super_admin','platform_admin')"
    );

    let bcryptCount = 0;
    let sha256Count = 0;
    const sha256Accounts = [];

    for (const admin of admins) {
      const hash = admin.password_hash || "";
      if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
        bcryptCount++;
        console.log(`  ✓ BCRYPT   ${admin.email}`);
      } else if (/^[0-9a-f]{64}$/i.test(hash)) {
        sha256Count++;
        sha256Accounts.push(admin.email);
        console.log(`  ✗ SHA-256  ${admin.email}  ← NEEDS UPGRADE`);
      } else {
        console.log(`  ? UNKNOWN  ${admin.email}  (hash: ${hash.substring(0,10)}...)`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  ${bcryptCount} account(s) already using bcrypt ✓`);
    console.log(`  ${sha256Count} account(s) still using SHA-256 (weak) ✗`);

    if (sha256Count > 0) {
      console.log(`\nTo upgrade SHA-256 accounts, run:`);
      for (const email of sha256Accounts) {
        console.log(`  node scripts/set-admin-password.js "${email}" <new-secure-password>`);
      }
    } else {
      console.log(`\nAll admin accounts are using bcrypt. No action needed.`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
