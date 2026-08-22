const mysql = require("mysql2/promise");

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });

  try {
    const [cols] = await conn.execute("DESCRIBE store_applications");
    const colNames = new Set(cols.map((c) => c.Field));

    if (!colNames.has("application_fee_cfa")) {
      await conn.execute("ALTER TABLE store_applications ADD COLUMN application_fee_cfa INT NOT NULL DEFAULT 5000");
      console.log("Added application_fee_cfa column");
    }
    if (!colNames.has("payment_status")) {
      await conn.execute("ALTER TABLE store_applications ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending'");
      console.log("Added payment_status column");
    }
    if (!colNames.has("payment_reference")) {
      await conn.execute("ALTER TABLE store_applications ADD COLUMN payment_reference VARCHAR(190) NULL");
      console.log("Added payment_reference column");
    }
    if (!colNames.has("payment_gateway")) {
      await conn.execute("ALTER TABLE store_applications ADD COLUMN payment_gateway VARCHAR(50) NULL DEFAULT 'fapshi'");
      console.log("Added payment_gateway column");
    }
    if (!colNames.has("paid_at")) {
      await conn.execute("ALTER TABLE store_applications ADD COLUMN paid_at TIMESTAMP NULL");
      console.log("Added paid_at column");
    }

    const [updatedCols] = await conn.execute("DESCRIBE store_applications");
    console.log("store_applications columns:", updatedCols.map((c) => c.Field));
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await conn.end();
  }
}

migrate();
