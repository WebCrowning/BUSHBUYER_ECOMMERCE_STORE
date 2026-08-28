import { query } from "@/lib/db";

export interface ProductRow {
  id: number;
  store_id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  transport_fee: number;
  image: string;
  image_zoom: number;
  description: string;
  featured: number;
  category: string;
  package_name: string;
  unit_type: "pcs" | "kg";
  unit_value: number;
  stock_packages: number;
  sku?: string | null;
  barcode?: string | null;
  videos_json?: string | null;
  specifications_json?: string | null;
  gallery_images?: string | null;
  weight_kg: number;
  dimensions_cm?: string | null;
  warranty_info?: string | null;
  subcategory?: string | null;
  tags?: string | null;
  brand?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  status: "active" | "draft" | "archived" | "blocked" | string;
  is_digital: number;
  marketplace_enabled?: number;
  admin_blocked?: number;
  admin_block_reason?: string | null;
  created_at?: string;
  store_name?: string;
  store_slug?: string;
}

import { Product } from "@/types";

export class ProductRepository {
  static mapToProduct(row: ProductRow): Product {
    return {
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      storeSlug: row.store_slug,
      name: row.name,
      price: Number(row.price),
      discountPrice: row.discount_price ? Number(row.discount_price) : null,
      transportFee: Number(row.transport_fee || 0),
      image: row.image,
      imageZoom: Number(row.image_zoom || 100),
      description: row.description || "",
      featured: Number(row.featured || 0),
      category: row.category || "General",
      packageName: (row.package_name as any) || "pack",
      unitType: (row.unit_type as any) || "pcs",
      unitValue: Number(row.unit_value || 1),
      stockPackages: Number(row.stock_packages || 0),
      status: row.status || "active",
      marketplace_enabled: row.marketplace_enabled !== undefined ? Number(row.marketplace_enabled) : 1,
      admin_blocked: row.admin_blocked !== undefined ? Number(row.admin_blocked) : (row.status === "blocked" ? 1 : 0),
      admin_block_reason: row.admin_block_reason || null,
      galleryImages: (() => {
        if (!row.gallery_images) return [];
        try { return JSON.parse(row.gallery_images) as string[]; } catch { return []; }
      })(),
    };
  }
  static async findById(id: number, options?: { allowBlocked?: boolean }): Promise<ProductRow | null> {
    let sql = `
      SELECT p.*, s.name AS store_name, s.slug AS store_slug
      FROM products p
      LEFT JOIN stores s ON s.id = p.store_id
      WHERE p.id = ?
    `;
    const params: any[] = [id];
    if (!options?.allowBlocked) {
      sql += " AND p.status != 'blocked' AND (p.admin_blocked IS NULL OR p.admin_blocked = 0)";
    }
    sql += " LIMIT 1";
    const rows = await query<ProductRow[]>(sql, params);
    return rows[0] || null;
  }

  static async listProducts(options: {
    store_id?: number;
    category?: string;
    featured?: boolean;
    search?: string;
    status?: string;
    include_blocked?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProductRow[]> {
    const { store_id, category, featured, search, status, include_blocked = false, limit = 50, offset = 0 } = options;

    let sql = `
      SELECT p.*, s.name AS store_name, s.slug AS store_slug
      FROM products p
      LEFT JOIN stores s ON s.id = p.store_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    } else if (!include_blocked) {
      sql += " AND p.status != 'blocked' AND (p.admin_blocked IS NULL OR p.admin_blocked = 0)";
    }

    if (store_id !== undefined && store_id !== null) {
      sql += " AND p.store_id = ?";
      params.push(store_id);
    }

    if (category && category !== "All") {
      sql += " AND p.category = ?";
      params.push(category);
    }

    if (featured) {
      sql += " AND p.featured = 1";
    }

    if (search) {
      sql += " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += " ORDER BY p.featured DESC, p.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return query<ProductRow[]>(sql, params);
  }

  static async createProduct(data: Partial<ProductRow>): Promise<ProductRow> {
    const res = await query<{ insertId: number }>(
      `INSERT INTO products (
        store_id, name, price, discount_price, transport_fee, image, image_zoom, description, featured, category,
        package_name, unit_type, unit_value, stock_packages, sku, barcode, videos_json, specifications_json,
        weight_kg, dimensions_cm, warranty_info, subcategory, tags, brand, meta_title, meta_description, status, is_digital,
        marketplace_enabled, admin_blocked, admin_block_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.store_id || 1,
        data.name,
        data.price,
        data.discount_price || null,
        data.transport_fee || 0,
        data.image,
        data.image_zoom || 100,
        data.description || "",
        data.featured ? 1 : 0,
        data.category || "General",
        data.package_name || "pack",
        data.unit_type || "pcs",
        data.unit_value || 1.0,
        data.stock_packages || 0,
        data.sku || null,
        data.barcode || null,
        data.videos_json || null,
        data.specifications_json || null,
        data.weight_kg || 0.0,
        data.dimensions_cm || null,
        data.warranty_info || null,
        data.subcategory || null,
        data.tags || null,
        data.brand || null,
        data.meta_title || null,
        data.meta_description || null,
        data.status || "active",
        data.is_digital ? 1 : 0,
        data.marketplace_enabled !== undefined ? data.marketplace_enabled : 1,
        data.admin_blocked !== undefined ? data.admin_blocked : 0,
        data.admin_block_reason || null,
      ]
    );

    const created = await this.findById(res.insertId, { allowBlocked: true });
    return created!;
  }

  static async updateProduct(id: number, data: Partial<ProductRow>): Promise<void> {
    await query(
      `UPDATE products SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        discount_price = COALESCE(?, discount_price),
        transport_fee = COALESCE(?, transport_fee),
        image = COALESCE(?, image),
        description = COALESCE(?, description),
        featured = COALESCE(?, featured),
        category = COALESCE(?, category),
        package_name = COALESCE(?, package_name),
        unit_type = COALESCE(?, unit_type),
        unit_value = COALESCE(?, unit_value),
        stock_packages = COALESCE(?, stock_packages),
        sku = COALESCE(?, sku),
        barcode = COALESCE(?, barcode),
        status = COALESCE(?, status),
        marketplace_enabled = COALESCE(?, marketplace_enabled),
        admin_blocked = COALESCE(?, admin_blocked),
        admin_block_reason = COALESCE(?, admin_block_reason)
       WHERE id = ?`,
      [
        data.name || null,
        data.price || null,
        data.discount_price || null,
        data.transport_fee || null,
        data.image || null,
        data.description || null,
        data.featured !== undefined ? (data.featured ? 1 : 0) : null,
        data.category || null,
        data.package_name || null,
        data.unit_type || null,
        data.unit_value || null,
        data.stock_packages !== undefined ? data.stock_packages : null,
        data.sku || null,
        data.barcode || null,
        data.status || null,
        data.marketplace_enabled !== undefined ? data.marketplace_enabled : null,
        data.admin_blocked !== undefined ? data.admin_blocked : null,
        data.admin_block_reason || null,
        id,
      ]
    );
  }

  static async listCategories(storeId?: number): Promise<string[]> {
    const rows = storeId
      ? await query<Array<{ category: string }>>(
          "SELECT DISTINCT category FROM products WHERE store_id = ? AND category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC",
          [storeId]
        )
      : await query<Array<{ category: string }>>(
          "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC"
        );
    return rows.map((r) => r.category);
  }

  static async deleteProduct(id: number): Promise<void> {
    await query("DELETE FROM products WHERE id = ?", [id]);
  }
}
