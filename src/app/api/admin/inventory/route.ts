import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";

type InventoryRow = {
  id: number;
  name: string;
  category: string;
  price: number;
  stockPackages: number;
  packageName: "pack" | "bag" | "bundle" | "carton";
  unitType: "kg" | "pcs";
  unitValue: number;
  featured: number;
};

type SummaryRow = {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalPackagesAvailable: number;
};

export async function GET() {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const storeFilter = !access.isSuperAdmin
      ? "WHERE store_id = ?"
      : "";
    const params = !access.isSuperAdmin && access.primaryStoreId
      ? [access.primaryStoreId]
      : [];

    const [summaryRows, products] = await Promise.all([
      query<SummaryRow[]>(
        `SELECT
           COUNT(*) AS totalProducts,
           SUM(CASE WHEN stock_packages > 0 THEN 1 ELSE 0 END) AS inStockProducts,
           SUM(CASE WHEN stock_packages > 0 AND stock_packages <= 5 THEN 1 ELSE 0 END) AS lowStockProducts,
           SUM(CASE WHEN stock_packages = 0 THEN 1 ELSE 0 END) AS outOfStockProducts,
           COALESCE(SUM(stock_packages), 0) AS totalPackagesAvailable
         FROM products ${storeFilter}`,
        params,
      ),
      query<InventoryRow[]>(
        `SELECT
           id,
           name,
           category,
           price,
           stock_packages AS stockPackages,
           package_name AS packageName,
           unit_type AS unitType,
           unit_value AS unitValue,
           featured
         FROM products
         ${storeFilter}
         ORDER BY stock_packages ASC, featured DESC, created_at DESC`,
        params,
      ),
    ]);

    return NextResponse.json({
      summary: summaryRows[0] ?? {
        totalProducts: 0,
        inStockProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalPackagesAvailable: 0,
      },
      products,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
