/**
 * scripts/set-admin-password.js
 *
 * CLI helper to set or reset an admin user's password in the database.
 * Uses bcrypt (cost factor 12) — the secure standard for password storage.
 *
 * Usage:
 *   node scripts/set-admin-password.js <email> <new-password>
 *
 * Example:
 *   node scripts/set-admin-password.js admin@bushbuyer.com myNewPassword123
 *
 * Password requirements:
 *   - Minimum 12 characters recommended for admin accounts
 *   - Will be hashed with bcrypt (cost 12) before storage
 */

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error("Usage: node scripts/set-admin-password.js <email> <new-password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  console.log("Hashing password with bcrypt (cost 12)...");
  const hash = await bcrypt.hash(password, 12);

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });

  const [result] = await conn.execute(
    "UPDATE users SET password_hash = ? WHERE LOWER(email) = ? AND role IN ('admin', 'sub_admin', 'super_admin', 'platform_admin')",
    [hash, email.toLowerCase().trim()]
  );

  await conn.end();

  if (result.affectedRows === 0) {
    console.error(`No admin user found with email: ${email}`);
    console.error("   Make sure the user exists in the database with an admin role.");
    process.exit(1);
  }

  console.log(`\n✓ Password updated for admin: ${email}`);
  console.log(`  Hash algorithm: bcrypt (cost 12)`);
  console.log(`  Hash prefix: ${hash.substring(0, 7)}...`);
  console.log("\n  IMPORTANT: The old SHA-256 hash has been replaced.");
  console.log("  Use this script to upgrade all admin accounts to bcrypt.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
