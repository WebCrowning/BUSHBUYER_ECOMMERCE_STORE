import mysql from "mysql2/promise";
import { env } from "@/lib/env";
import { defaultPageContent } from "@/lib/page-content";

type MysqlLikeError = {
  message?: string;
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  stack?: string;
};

// Force IPv4: Node.js may resolve "localhost" to ::1 (IPv6) which some
// MySQL servers (e.g. Hostinger shared hosting) reject with ACCESS_DENIED.
const dbHost = env.dbHost === "localhost" ? "127.0.0.1" : env.dbHost;

const pool = mysql.createPool({
  host: dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  decimalNumbers: true,
});

let schemaInitPromise: Promise<void> | null = null;

async function hasColumn(tableName: string, columnName: string) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );

  const countRows = rows as Array<{ count: number }>;

  return Number(countRows[0]?.count ?? 0) > 0;
}

async function ensurePackageSchema() {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS traffic_events (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          path VARCHAR(255) NOT NULL,
          referrer VARCHAR(255) NULL,
          user_agent VARCHAR(255) NULL,
          session_key CHAR(64) NOT NULL,
          country VARCHAR(60) NULL,
          load_ms INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_traffic_created_at (created_at),
          INDEX idx_traffic_path_created_at (path, created_at),
          INDEX idx_traffic_session_created_at (session_key, created_at)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS cms_pages (
          slug VARCHAR(64) PRIMARY KEY,
          title VARCHAR(180) NOT NULL,
          content_html LONGTEXT NOT NULL,
          updated_by VARCHAR(191) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(190) NOT NULL UNIQUE,
          image TEXT NULL,
          provider VARCHAR(80) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(190) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          image TEXT NOT NULL,
          image_zoom INT NOT NULL DEFAULT 100,
          description TEXT NOT NULL,
          featured TINYINT(1) DEFAULT 0,
          category VARCHAR(80) DEFAULT 'General',
          package_name VARCHAR(50) NOT NULL DEFAULT 'pack',
          unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs',
          unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000,
          stock_packages INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          public_order_id VARCHAR(32) NOT NULL UNIQUE,
          user_id INT NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          status ENUM('Pending','Paid','Shipped','Delivered') DEFAULT 'Pending',
          address TEXT NOT NULL,
          phone VARCHAR(40) NOT NULL,
          country VARCHAR(80) NOT NULL,
          customer_name VARCHAR(120) NOT NULL,
          customer_email VARCHAR(190) NOT NULL,
          payment_id VARCHAR(120) NULL UNIQUE,
          received_confirmed_at TIMESTAMP NULL,
          paypal_order_id VARCHAR(120) NULL UNIQUE,
          paypal_transaction_id VARCHAR(120) NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity_packages INT NOT NULL,
          unit_type ENUM('pcs','kg') NOT NULL,
          unit_value DECIMAL(10,3) NOT NULL,
          package_name VARCHAR(50) NOT NULL DEFAULT 'pack',
          price DECIMAL(10,2) NOT NULL,
          transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          product_name_snapshot VARCHAR(190) NOT NULL,
          product_image_snapshot TEXT NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          audience ENUM('user','admin') NOT NULL,
          type VARCHAR(60) NOT NULL DEFAULT 'general',
          title VARCHAR(190) NOT NULL,
          body TEXT NULL,
          link VARCHAR(255) NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
          INDEX idx_notifications_audience_read_created (audience, is_read, created_at)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS faq (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question VARCHAR(500) NOT NULL,
          answer TEXT NOT NULL,
          question_fr VARCHAR(500) NULL DEFAULT NULL,
          answer_fr TEXT NULL DEFAULT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'General',
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_faq_category (category),
          INDEX idx_faq_created_at (created_at)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          customer_email VARCHAR(190) NULL,
          message TEXT NOT NULL,
          reply TEXT NULL,
          status ENUM('Open','Replied') DEFAULT 'Open',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
      );

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS store_applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          store_name VARCHAR(190) NOT NULL,
          business_category VARCHAR(100) NOT NULL DEFAULT 'General',
          products_description TEXT NOT NULL,
          phone VARCHAR(40) NULL,
          email VARCHAR(190) NULL,
          additional_notes TEXT NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          admin_notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_store_app_user (user_id),
          INDEX idx_store_app_status (status)
        )`,
      );

      await pool.execute(
        `INSERT INTO cms_pages (slug, title, content_html)
         VALUES
           ('about', 'About Us', ?),
           ('privacy', 'Privacy Policy', ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        [defaultPageContent("about"), defaultPageContent("privacy")],
      );

      const productsColumns = [
        {
          name: "transport_fee",
          ddl: "ALTER TABLE products ADD COLUMN transport_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00",
        },
        {
          name: "image_zoom",
          ddl: "ALTER TABLE products ADD COLUMN image_zoom INT NOT NULL DEFAULT 100",
        },
        {
          name: "package_name",
          ddl: "ALTER TABLE products ADD COLUMN package_name VARCHAR(50) NOT NULL DEFAULT 'pack'",
        },
        {
          name: "unit_type",
          ddl: "ALTER TABLE products ADD COLUMN unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs'",
        },
        {
          name: "unit_value",
          ddl: "ALTER TABLE products ADD COLUMN unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000",
        },
        {
          name: "stock_packages",
          ddl: "ALTER TABLE products ADD COLUMN stock_packages INT NOT NULL DEFAULT 0",
        },
        {
          name: "store_id",
          ddl: "ALTER TABLE products ADD COLUMN store_id INT NOT NULL DEFAULT 0",
        },
        {
          name: "status",
          ddl: "ALTER TABLE products ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'",
        },
        {
          name: "marketplace_enabled",
          ddl: "ALTER TABLE products ADD COLUMN marketplace_enabled TINYINT(1) NOT NULL DEFAULT 1",
        },
        {
          name: "admin_blocked",
          ddl: "ALTER TABLE products ADD COLUMN admin_blocked TINYINT(1) NOT NULL DEFAULT 0",
        },
        {
          name: "admin_block_reason",
          ddl: "ALTER TABLE products ADD COLUMN admin_block_reason VARCHAR(255) NULL",
        },
        {
          name: "gallery_images",
          ddl: "ALTER TABLE products ADD COLUMN gallery_images TEXT NULL",
        },
      ];

      for (const column of productsColumns) {
        const exists = await hasColumn("products", column.name);
        if (!exists) {
          try {
            await pool.execute(column.ddl);
          } catch {
            // Non-fatal if column exists
          }
        }
      }

      // Ensure status column allows VARCHAR (e.g. 'blocked', 'active', 'draft', 'archived')
      try {
        await pool.execute("ALTER TABLE products MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'");
      } catch {
        // Non-fatal
      }

      const hasLegacyUnit = await hasColumn("products", "unit");
      const hasLegacyStock = await hasColumn("products", "stock");
      if (hasLegacyUnit && hasLegacyStock) {
        await pool.execute(
          `UPDATE products
           SET
             package_name = CASE
               WHEN unit = 'kg' THEN 'pack'
               WHEN unit = 'pcs' THEN 'bag'
               ELSE package_name
             END,
             unit_type = CASE
               WHEN unit = 'kg' THEN 'kg'
               WHEN unit = 'pcs' THEN 'pcs'
               ELSE unit_type
             END,
             unit_value = CASE
               WHEN unit IN ('kg', 'pcs') THEN 1.000
               ELSE unit_value
             END,
             stock_packages = CASE
               WHEN stock IS NOT NULL THEN GREATEST(0, FLOOR(stock))
               ELSE stock_packages
             END
           WHERE stock_packages = 0 OR package_name IS NULL OR unit_type IS NULL OR unit_value IS NULL`,
        );
      }

      const orderItemColumns = [
        {
          name: "quantity_packages",
          ddl: "ALTER TABLE order_items ADD COLUMN quantity_packages INT NOT NULL DEFAULT 1",
        },
        {
          name: "unit_type",
          ddl: "ALTER TABLE order_items ADD COLUMN unit_type ENUM('pcs','kg') NOT NULL DEFAULT 'pcs'",
        },
        {
          name: "unit_value",
          ddl: "ALTER TABLE order_items ADD COLUMN unit_value DECIMAL(10,3) NOT NULL DEFAULT 1.000",
        },
        {
          name: "package_name",
          ddl: "ALTER TABLE order_items ADD COLUMN package_name VARCHAR(50) NOT NULL DEFAULT 'pack'",
        },
      ];

      for (const column of orderItemColumns) {
        const exists = await hasColumn("order_items", column.name);
        if (!exists) {
          await pool.execute(column.ddl);
        }
      }

      const hasLegacyOrderQty = await hasColumn("order_items", "quantity");
      if (hasLegacyOrderQty) {
        await pool.execute(
          `UPDATE order_items
           SET quantity_packages = GREATEST(1, FLOOR(quantity))
           WHERE quantity_packages = 1`,
        );
      }

      const hasMessageEmail = await hasColumn("messages", "customer_email");
      if (!hasMessageEmail) {
        await pool.execute(
          "ALTER TABLE messages ADD COLUMN customer_email VARCHAR(190) NULL",
        );
      }

      const hasPasswordHash = await hasColumn("users", "password_hash");
      if (!hasPasswordHash) {
        await pool.execute(
          "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL",
        );
      }

      const hasFaqQuestionFr = await hasColumn("faq", "question_fr");
      if (!hasFaqQuestionFr) {
        await pool.execute("ALTER TABLE faq ADD COLUMN question_fr VARCHAR(500) NULL DEFAULT NULL");
      }

      const hasFaqAnswerFr = await hasColumn("faq", "answer_fr");
      if (!hasFaqAnswerFr) {
        await pool.execute("ALTER TABLE faq ADD COLUMN answer_fr TEXT NULL DEFAULT NULL");
      }

      const hasReferredByStore = await hasColumn("users", "referred_by_store_id");
      if (!hasReferredByStore) {
        await pool.execute(
          "ALTER TABLE users ADD COLUMN referred_by_store_id INT NULL",
        );
      }

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          slug VARCHAR(120) NOT NULL UNIQUE,
          icon VARCHAR(20) NULL DEFAULT '📦',
          description TEXT NULL,
          color VARCHAR(20) NOT NULL DEFAULT '#6B7280',
          sort_order INT NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_categories_active_sort (is_active, sort_order)
        )`
      );

      const storeColumns = [
        { name: "quarter", ddl: "ALTER TABLE stores ADD COLUMN quarter VARCHAR(120) NULL" },
        { name: "landmark", ddl: "ALTER TABLE stores ADD COLUMN landmark VARCHAR(190) NULL" },
        { name: "latitude", ddl: "ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,8) NULL" },
        { name: "longitude", ddl: "ALTER TABLE stores ADD COLUMN longitude DECIMAL(11,8) NULL" },
        { name: "gps_coordinates", ddl: "ALTER TABLE stores ADD COLUMN gps_coordinates VARCHAR(100) NULL" },
        { name: "is_location_verified", ddl: "ALTER TABLE stores ADD COLUMN is_location_verified TINYINT(1) NOT NULL DEFAULT 0" },
        { name: "location_verified_at", ddl: "ALTER TABLE stores ADD COLUMN location_verified_at TIMESTAMP NULL" },
        { name: "location_accuracy_meters", ddl: "ALTER TABLE stores ADD COLUMN location_accuracy_meters INT NULL" },
        { name: "location_verification_method", ddl: "ALTER TABLE stores ADD COLUMN location_verification_method VARCHAR(50) NULL" },
      ];

      for (const col of storeColumns) {
        const exists = await hasColumn("stores", col.name);
        if (!exists) {
          try {
            await pool.execute(col.ddl);
          } catch {
            // Ignore if column already exists
          }
        }
      }

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS user_store_visits (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT NULL,
          store_id BIGINT NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(255) NULL,
          visit_count INT NOT NULL DEFAULT 1,
          last_visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_visits (user_id, last_visited_at),
          INDEX idx_store_visits (store_id, last_visited_at)
        )`
      );

      const storeAppColumns = [
        { name: "application_fee_cfa", ddl: "ALTER TABLE store_applications ADD COLUMN application_fee_cfa INT NOT NULL DEFAULT 5000" },
        { name: "payment_status", ddl: "ALTER TABLE store_applications ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending'" },
        { name: "payment_reference", ddl: "ALTER TABLE store_applications ADD COLUMN payment_reference VARCHAR(190) NULL" },
        { name: "payment_gateway", ddl: "ALTER TABLE store_applications ADD COLUMN payment_gateway VARCHAR(50) NULL DEFAULT 'fapshi'" },
        { name: "paid_at", ddl: "ALTER TABLE store_applications ADD COLUMN paid_at TIMESTAMP NULL" },
      ];

      for (const col of storeAppColumns) {
        const exists = await hasColumn("store_applications", col.name);
        if (!exists) {
          try {
            await pool.execute(col.ddl);
          } catch {
            // Ignore if column already exists
          }
        }
      }

      try {
        await pool.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'user'");
      } catch {
        // Ignore if role modification fails
      }

      // Do NOT seed default admin credentials.
      // Run: node scripts/set-admin-password.js admin@example.com <password>
      // to create the first admin account securely with bcrypt hashing.
    })().catch((error) => {
      console.warn("Schema initialization warning (non-fatal):", error);
      schemaInitPromise = Promise.resolve();
    });
  }

  await schemaInitPromise;
}

export async function query<T>(sql: string, params: unknown[] = []) {
  try {
    await ensurePackageSchema();
    const [rows] = await pool.query(sql, params as any);
    return rows as T;
  } catch (error) {
    const dbError = (error ?? {}) as MysqlLikeError;
    const errorMessage =
      dbError.sqlMessage ||
      dbError.message ||
      (error instanceof Error ? error.message : String(error));
    const errorCode = dbError.code ?? "UNKNOWN";
    const errorErrno = dbError.errno ?? null;
    const errorSqlState = dbError.sqlState ?? null;

    const serialized = JSON.stringify(
      {
        sql,
        params,
        message: errorMessage,
        code: errorCode,
        errno: errorErrno,
        sqlState: errorSqlState,
        stack: error instanceof Error ? error.stack : null,
      },
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
    );

    // Use a single string argument so Next.js/Turbopack overlay does not collapse it to {}.
    console.error(`Database query error: ${serialized}`);
    throw error;
  }
}

export async function getConnection() {
  await ensurePackageSchema();
  return pool.getConnection();
}
