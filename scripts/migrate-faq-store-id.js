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
    // 1. Add column
    await conn.execute("ALTER TABLE faq ADD COLUMN IF NOT EXISTS store_id INT NULL DEFAULT NULL");
    console.log("OK: store_id column added (or already exists)");

    // 2. Add FK if not already present
    const [fkRows] = await conn.execute(
      "SELECT COUNT(*) AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faq' AND COLUMN_NAME = 'store_id' AND REFERENCED_TABLE_NAME = 'stores'"
    );
    if (fkRows[0].c === 0) {
      try {
        await conn.execute("ALTER TABLE faq ADD CONSTRAINT fk_faq_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE");
        console.log("OK: foreign key added");
      } catch (e) {
        console.log("FK skipped:", e.message);
      }
    } else {
      console.log("Foreign key already exists");
    }

    // 3. Add index if not already present
    const [idxRows] = await conn.execute(
      "SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faq' AND INDEX_NAME = 'idx_faq_store_id'"
    );
    if (idxRows[0].c === 0) {
      await conn.execute("CREATE INDEX idx_faq_store_id ON faq (store_id)");
      console.log("OK: index added");
    } else {
      console.log("Index already exists");
    }

    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
