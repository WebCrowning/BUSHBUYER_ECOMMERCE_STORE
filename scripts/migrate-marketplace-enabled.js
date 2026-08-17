const mysql = require("mysql2/promise");

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });
  try {
    // 1. Add marketplace_enabled column
    await conn.execute(
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_enabled TINYINT(1) NOT NULL DEFAULT 0"
    );
    console.log("OK: marketplace_enabled column added (or already exists)");

    // 2. Index for fast filtering on public products page
    const [rows] = await conn.execute(
      "SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_marketplace'"
    );
    if (rows[0].c === 0) {
      await conn.execute("CREATE INDEX idx_products_marketplace ON products (marketplace_enabled, status)");
      console.log("OK: index idx_products_marketplace added");
    } else {
      console.log("Index idx_products_marketplace already exists");
    }

    // 3. Existing store_id=0 products are the legacy global catalog — enable them automatically
    //    so the /products page keeps working exactly as before.
    const [updateResult] = await conn.execute(
      "UPDATE products SET marketplace_enabled = 1 WHERE store_id = 0 AND marketplace_enabled = 0"
    );
    console.log(`OK: ${updateResult.affectedRows} legacy global products (store_id=0) auto-enabled`);

    console.log("\nMigration complete.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
