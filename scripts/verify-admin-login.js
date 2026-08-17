const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

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
} catch (e) {}

async function testAdminLogin(email, password) {
  console.log(`\n--- Testing Database Admin Authentication for: ${email} ---`);
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD ?? env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE || env.MYSQL_DATABASE || "bushfaller",
  });

  // Query database user (mimicking UserRepository.findByEmailWithPassword)
  const [rows] = await conn.execute(
    "SELECT id, name, email, image, provider, role, is_blocked, password_hash FROM users WHERE LOWER(email) = ? LIMIT 1",
    [email.toLowerCase().trim()]
  );

  await conn.end();

  const user = rows[0];
  if (!user) {
    console.error("❌ FAILED: No user found in database with that email.");
    return false;
  }

  console.log(`✓ Database user found: ID ${user.id}, Role: '${user.role}', Blocked: ${user.is_blocked}`);

  const allowedRoles = ["admin", "sub_admin", "super_admin", "platform_admin"];
  if (!allowedRoles.includes(user.role)) {
    console.error(`❌ FAILED: User role '${user.role}' is not an admin role.`);
    return false;
  }

  if (user.is_blocked) {
    console.error("❌ FAILED: User is blocked.");
    return false;
  }

  if (!user.password_hash) {
    console.error("❌ FAILED: User has no password_hash stored in database.");
    return false;
  }

  // Perform bcrypt verification
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (isValid) {
    console.log("==================================================");
    console.log("✅ DATABASE ADMIN LOGIN VERIFIED SUCCESSFULLY!");
    console.log(`   User authenticated as '${user.name}' (${user.role})`);
    console.log("==================================================");
    return true;
  } else {
    console.error("❌ FAILED: Password comparison failed.");
    return false;
  }
}

testAdminLogin("admin@bushbuyer.com", "Bushbuyer#Admin2026!SecureKey").catch(console.error);
