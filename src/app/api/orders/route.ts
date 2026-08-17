import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConnection, query } from "@/lib/db";
import { sendOrderCreatedEmails } from "@/lib/email";
import { createAdminNotification } from "@/lib/notifications";
import { generateOrderReference } from "@/lib/order-reference";
import { orderSchema } from "@/lib/validation";
import { validateSameOrigin } from "@/lib/request-security";
import type { Order, OrderItem } from "@/types";

type DbInsert = {
  insertId: number;
};

type ProductForOrder = {
  id: number;
  name: string;
  image: string;
  price: number;
  transport_fee: number;
  stock_packages: number;
  package_name: "pack" | "bag" | "bundle" | "carton";
  unit_type: "pcs" | "kg";
  unit_value: number;
};

type ExistingOrder = {
  id: number;
};

type ApiError = {
  status: number;
  message: string;
};

function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as Partial<ApiError>;
  return typeof maybeError.status === "number" && typeof maybeError.message === "string";
}

function normalizePackageQty(value: number) {
  return Math.max(1, Math.round(Number(value)));
}

function isDuplicatePublicOrderReferenceError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeMysqlError = error as { code?: unknown; message?: unknown };
  if (maybeMysqlError.code !== "ER_DUP_ENTRY") {
    return false;
  }

  return (
    typeof maybeMysqlError.message === "string" &&
    maybeMysqlError.message.includes("uq_orders_public_order_id")
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await query<Order[]>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [Number(session.user.id)],
    );
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [existingOrderRows] = await conn.execute(
      "SELECT id FROM orders WHERE payment_id = ? LIMIT 1",
      [parsed.data.paymentId],
    );

    if (Array.isArray(existingOrderRows) && existingOrderRows.length > 0) {
      throw { status: 409, message: "Payment already used for an order" } satisfies ApiError;
    }

    const quantityByProduct = new Map<number, number>();
    for (const item of parsed.data.items) {
      const normalizedQty = normalizePackageQty(Number(item.quantityPackages));
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) ?? 0) + normalizedQty,
      );
    }

    const productIds = Array.from(quantityByProduct.keys());
    const placeholders = productIds.map(() => "?").join(",");

    const [productRowsRaw] = await conn.execute(
      `SELECT id, name, image, price, transport_fee, stock_packages, package_name, unit_type, unit_value FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds,
    );

    const productRows = (Array.isArray(productRowsRaw) ? productRowsRaw : []) as ProductForOrder[];
    if (productRows.length !== productIds.length) {
      throw { status: 400, message: "One or more products are invalid" } satisfies ApiError;
    }

    const productMap = new Map<number, ProductForOrder>(
      productRows.map((product) => [product.id, {
        ...product,
        price: Number(product.price),
      }]),
    );

    for (const [productId, quantity] of quantityByProduct.entries()) {
      const product = productMap.get(productId);
      if (!product) {
        throw { status: 400, message: "One or more products are invalid" } satisfies ApiError;
      }

      if (quantity > Number(product.stock_packages)) {
        throw {
          status: 409,
          message: `Insufficient package stock for ${product.name}`,
        } satisfies ApiError;
      }
    }

    const total = Array.from(quantityByProduct.entries()).reduce((sum, [productId, quantity]) => {
      const product = productMap.get(productId);
      return sum + (product ? (product.price + Number(product.transport_fee ?? 0)) * quantity : 0);
    }, 0);

    let orderId = 0;
    let publicOrderId = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextPublicOrderId = generateOrderReference();

      try {
        const [insertOrder] = await conn.execute(
          `
          INSERT INTO orders
          (public_order_id, user_id, total_price, status, address, phone, country, customer_name, customer_email, payment_id)
          VALUES (?, ?, ?, 'Paid', ?, ?, ?, ?, ?, ?)
          `,
          [
            nextPublicOrderId,
            Number(session.user.id),
            total,
            parsed.data.address,
            parsed.data.phone,
            parsed.data.country,
            parsed.data.customerName,
            parsed.data.customerEmail,
            parsed.data.paymentId,
          ],
        );

        orderId = ((insertOrder as unknown as DbInsert | { insertId: number }).insertId || 0);
        publicOrderId = nextPublicOrderId;
        break;
      } catch (error) {
        if (isDuplicatePublicOrderReferenceError(error) && attempt < 4) {
          continue;
        }
        throw error;
      }
    }

    if (!orderId || !publicOrderId) {
      throw { status: 500, message: "Failed to assign secure order reference" } satisfies ApiError;
    }

    for (const item of parsed.data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw { status: 400, message: "One or more products are invalid" } satisfies ApiError;
      }

      await conn.execute(
        `INSERT INTO order_items
         (order_id, product_id, quantity_packages, unit_type, unit_value, package_name, price, transport_fee, product_name_snapshot, product_image_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          normalizePackageQty(Number(item.quantityPackages)),
          product.unit_type === "kg" ? "kg" : "pcs",
          Number(product.unit_value ?? 1),
          product.package_name,
          product.price,
          Number(product.transport_fee ?? 0),
          product.name,
          product.image,
        ],
      );
    }

    for (const [productId, quantity] of quantityByProduct.entries()) {
      await conn.execute(
        "UPDATE products SET stock_packages = stock_packages - ? WHERE id = ? AND stock_packages >= ?",
        [quantity, productId, quantity],
      );
    }

    await conn.commit();
    await createAdminNotification({
      type: "order",
      title: `New order ${publicOrderId}`,
      body: `${parsed.data.customerName} placed a paid order.`,
      link: "/admin/orders",
    });

    await sendOrderCreatedEmails({
      orderId: publicOrderId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      total,
    });

    return NextResponse.json({ orderId: publicOrderId }, { status: 201 });
  } catch (error: unknown) {
    await conn.rollback();

    if (isApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error && typeof error === "object") {
      const dbError = error as { code?: unknown; message?: unknown };
      if (
        dbError.code === "ER_BAD_FIELD_ERROR" &&
        typeof dbError.message === "string" &&
        dbError.message.includes("public_order_id")
      ) {
        return NextResponse.json(
          { error: "Database migration is pending. Please run migrations and try again." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const orderId = Number(payload?.orderId ?? 0);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const items = await query<OrderItem[]>(
    `
    SELECT oi.id, oi.order_id, oi.product_id, oi.quantity_packages, oi.unit_type, oi.unit_value, oi.package_name, oi.price,
           oi.product_name_snapshot AS name,
           oi.product_image_snapshot AS image
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = ? AND o.user_id = ?
    `,
    [orderId, Number(session.user.id)],
  );

  return NextResponse.json({ items });
}
