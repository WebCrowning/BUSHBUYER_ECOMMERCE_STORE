import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";

type AdminOrder = {
  id: number;
  public_order_id: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  order_status: string;
  payment_status: string;
  received_confirmed_at: string | null;
  created_at: string;
  country: string;
  phone: string;
  address: string;
  store_id: number;
};

export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const paramStoreId = searchParams.get("storeId");

  try {
    let sql = `
      SELECT id, public_order_id, customer_name, customer_email, total_price,
             order_status, payment_status, received_confirmed_at, created_at,
             country, phone, address, store_id
      FROM orders
    `;
    const params: any[] = [];

    // If non-super admin, strictly restrict to user's assigned store
    if (!access.isSuperAdmin) {
      if (!access.primaryStoreId) {
        return NextResponse.json({ orders: [] });
      }
      sql += " WHERE store_id = ?";
      params.push(access.primaryStoreId);
    } else if (paramStoreId) {
      sql += " WHERE store_id = ?";
      params.push(Number(paramStoreId));
    }

    sql += " ORDER BY created_at DESC";

    const orders = await query<AdminOrder[]>(sql, params);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
