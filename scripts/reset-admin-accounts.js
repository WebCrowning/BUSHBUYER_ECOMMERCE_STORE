const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
let env = {};
try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2 && !line.trim().startsWith("#")) {
        env[parts[0].trim()] = parts.slice(1).join("=").trim();
      }
    });
  }
} catch (e) {
  console.warn("Warning loading .env.local:", e.message);
}

async function main() {
  const host = process.env.MYSQL_HOST || env.MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD ?? env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE || env.MYSQL_DATABASE || "bushfaller";

  console.log(`Connecting to MySQL database '${database}' on ${host}:${port}...`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  // Ensure role column is VARCHAR(50) to support super_admin, platform_admin, etc.
  try {
    await conn.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'");
  } catch (e) {}

  const adminRoles = ["admin", "sub_admin", "super_admin", "platform_admin", "finance_admin", ""];

  // 1. Fetch current admin users to log what's being deleted
  const placeholders = adminRoles.map(() => "?").join(",");
  const [existingAdmins] = await conn.execute(
    `SELECT id, name, email, role FROM users WHERE role IN (${placeholders})`,
    adminRoles
  );

  console.log(`Found ${existingAdmins.length} existing admin account(s) to remove:`);
  existingAdmins.forEach((a) => {
    console.log(`  - [ID ${a.id}] ${a.name} <${a.email}> (Role: ${a.role})`);
  });

  // 2. Clear FK references in chat conversations before deleting admins
  if (existingAdmins.length > 0) {
    const adminIds = existingAdmins.map((a) => a.id);
    const idPlaceholders = adminIds.map(() => "?").join(",");

    try {
      await conn.execute(
        `UPDATE admin_chat_conversations SET assigned_admin_id = NULL WHERE assigned_admin_id IN (${idPlaceholders})`,
        adminIds
      );
    } catch (e) {
      // Table might not exist or column might differ, ignore
    }

    try {
      await conn.execute(
        `UPDATE chat_conversations SET assigned_admin_id = NULL WHERE assigned_admin_id IN (${idPlaceholders})`,
        adminIds
      );
    } catch (e) {
      // Ignore if table missing
    }

    // 3. Delete existing admin accounts from users table
    const [deleteRes] = await conn.execute(
      `DELETE FROM users WHERE role IN (${placeholders})`,
      adminRoles
    );
    console.log(`✓ Successfully deleted ${deleteRes.affectedRows} existing admin account(s) from database.`);
  }

  // 4. Generate professional new Super Admin credentials
  const newAdminName = "System Administrator";
  const newAdminEmail = "admin@bushbuyer.com";
  const newPlainPassword = "Bushbuyer#Admin2026!SecureKey";
  const newRole = "super_admin";

  console.log(`\nHashing password for new admin account (${newAdminEmail}) with bcrypt (cost 12)...`);
  const passwordHash = await bcrypt.hash(newPlainPassword, 12);

  // 5. Insert new Admin into database
  const [insertRes] = await conn.execute(
    `INSERT INTO users (name, email, password_hash, provider, role, is_blocked)
     VALUES (?, ?, ?, 'credentials', ?, 0)`,
    [newAdminName, newAdminEmail.toLowerCase().trim(), passwordHash, newRole]
  );

  const newAdminId = insertRes.insertId;
  console.log(`\n======================================================`);
  console.log(`✓ NEW PROFESSIONAL ADMIN ACCOUNT INITIALIZED IN DATABASE!`);
  console.log(`======================================================`);
  console.log(`  User ID:    ${newAdminId}`);
  console.log(`  Name:       ${newAdminName}`);
  console.log(`  Email:      ${newAdminEmail}`);
  console.log(`  Role:       ${newRole}`);
  console.log(`  Provider:   credentials`);
  console.log(`  Password:   ${newPlainPassword}`);
  console.log(`  Bcrypt Hash: ${passwordHash.substring(0, 20)}...`);
  console.log(`======================================================\n`);

  await conn.end();
}

main().catch((err) => {
  console.error("❌ Reset script error:", err);
  process.exit(1);
});
