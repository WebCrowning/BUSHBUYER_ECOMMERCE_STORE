/**
 * scripts/migrate-categories.js
 * Creates the categories table and seeds it from existing product categories.
 * The platform is category-agnostic — not food-specific.
 */
const mysql = require("mysql2/promise");

const DEFAULT_CATEGORIES = [
  // Seeded only if the table is empty after pulling from products
  { name: "General", slug: "general", icon: "📦", description: "General merchandise and miscellaneous items", color: "#6B7280", sort_order: 0 },
  { name: "Food & Groceries", slug: "food-groceries", icon: "🛒", description: "Fresh and packaged food products, groceries and pantry essentials", color: "#10B981", sort_order: 1 },
  { name: "Electronics", slug: "electronics", icon: "💻", description: "Electronic devices, gadgets and accessories", color: "#3B82F6", sort_order: 2 },
  { name: "Fashion & Apparel", slug: "fashion-apparel", icon: "👗", description: "Clothing, footwear and fashion accessories", color: "#EC4899", sort_order: 3 },
  { name: "Health & Beauty", slug: "health-beauty", icon: "💊", description: "Health products, cosmetics and personal care", color: "#8B5CF6", sort_order: 4 },
  { name: "Home & Living", slug: "home-living", icon: "🏠", description: "Home decor, furniture and household items", color: "#F59E0B", sort_order: 5 },
  { name: "Sports & Outdoors", slug: "sports-outdoors", icon: "⚽", description: "Sports equipment and outdoor gear", color: "#EF4444", sort_order: 6 },
  { name: "Books & Education", slug: "books-education", icon: "📚", description: "Books, stationery and educational materials", color: "#06B6D4", sort_order: 7 },
  { name: "Automotive", slug: "automotive", icon: "🚗", description: "Car parts, accessories and automotive products", color: "#64748B", sort_order: 8 },
  { name: "African Raw Foods", slug: "african-raw-foods", icon: "🌿", description: "Authentic African raw food ingredients — dried fish, eru, snails and more", color: "#22C55E", sort_order: 9 },
  { name: "Seafood", slug: "seafood", icon: "🦞", description: "Fresh and dried seafood products", color: "#0EA5E9", sort_order: 10 },
  { name: "Protein", slug: "protein", icon: "🥩", description: "Meat, poultry, eggs and protein sources", color: "#DC2626", sort_order: 11 },
  { name: "Vegetables", slug: "vegetables", icon: "🥦", description: "Fresh and dried vegetables", color: "#16A34A", sort_order: 12 },
  { name: "Digital Products", slug: "digital-products", icon: "⬇️", description: "Downloadable products, software and digital content", color: "#7C3AED", sort_order: 13 },
  { name: "Services", slug: "services", icon: "🛠️", description: "Professional services and consulting", color: "#9333EA", sort_order: 14 },
];

async function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bushfaller",
  });

  try {
    // 1. Create categories table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS categories (
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
      )
    `);
    console.log("OK: categories table created (or already exists)");

    // 2. Check if table is empty
    const [countRows] = await conn.execute("SELECT COUNT(*) AS c FROM categories");
    const existingCount = countRows[0].c;

    if (existingCount === 0) {
      // 3. Pull existing category names from products
      const [productCats] = await conn.execute(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category"
      );

      const existingNames = new Set(productCats.map(r => r.category.toLowerCase()));
      const toInsert = [...DEFAULT_CATEGORIES];

      // Add any product categories that aren't in our defaults
      for (const row of productCats) {
        const name = row.category.trim();
        const inDefaults = toInsert.some(d => d.name.toLowerCase() === name.toLowerCase());
        if (!inDefaults) {
          toInsert.push({
            name,
            slug: await slugify(name),
            icon: "📦",
            description: `${name} products`,
            color: "#6B7280",
            sort_order: toInsert.length,
          });
        }
      }

      for (const cat of toInsert) {
        await conn.execute(
          `INSERT IGNORE INTO categories (name, slug, icon, description, color, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [cat.name, cat.slug, cat.icon, cat.description, cat.color, cat.sort_order]
        );
      }
      console.log(`OK: ${toInsert.length} categories seeded`);
    } else {
      console.log(`Categories table already has ${existingCount} rows — skipping seed`);
    }

    // 4. Add category_id FK column to products (optional, for future use)
    const [colRows] = await conn.execute(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'category_id'"
    );
    if (colRows[0].c === 0) {
      await conn.execute("ALTER TABLE products ADD COLUMN category_id INT NULL");
      console.log("OK: products.category_id column added");

      // Back-fill category_id from category name
      await conn.execute(`
        UPDATE products p
        JOIN categories c ON LOWER(c.name) = LOWER(p.category)
        SET p.category_id = c.id
        WHERE p.category_id IS NULL
      `);
      const [fillRows] = await conn.execute("SELECT COUNT(*) AS c FROM products WHERE category_id IS NOT NULL");
      console.log(`OK: ${fillRows[0].c} products linked to category_id`);
    } else {
      console.log("products.category_id already exists");
    }

    console.log("\nCategories migration complete.");
  } finally {
    await conn.end();
  }
}

run().catch(err => { console.error("Migration failed:", err.message); process.exit(1); });
