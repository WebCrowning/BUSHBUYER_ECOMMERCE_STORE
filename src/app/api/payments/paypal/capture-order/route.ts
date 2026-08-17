import { NextResponse } from "next/server";
import { env, getRequiredEnv } from "@/lib/env";
import { getConnection, query } from "@/lib/db";
import { createAdminNotification } from "@/lib/notifications";
import { generateOrderReference } from "@/lib/order-reference";
import { paypalCaptureOrderSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, validateJsonRequest, validateSameOrigin } from "@/lib/request-security";
import { auth } from "@/auth";
import { WalletRepository } from "@/repositories/wallet.repository";
import { PaymentRepository } from "@/repositories/payment.repository";
import { ZodError } from "zod";

type PaypalCaptureResponse = {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
    amount?: {
      currency_code?: string;
      value?: string;
    };
  }>;
};

type ProductPriceRow = {
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

type ExistingPayPalOrder = {
  id: number;
  public_order_id: string;
  paypal_order_id: string | null;
  paypal_transaction_id: string | null;
};

type CheckoutSessionRow = {
  id: number;
  paypal_order_id: string;
  user_id: number;
  currency: string;
  verified_total: number;
  items_json: string;
  status: "created" | "consumed" | "expired";
  created_at: string;
};

type CheckoutSnapshotItem = {
  productId: number;
  quantityPackages: number;
  unitPrice: number;
  unitTransportFee: number;
  packageName: "pack" | "bag" | "bundle" | "carton";
  unitType: "pcs" | "kg";
  unitValue: number;
};

type DbInsert = {
  insertId: number;
};

type DbResult = {
  affectedRows: number;
};

const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;

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

function formatZodError(error: ZodError) {
  const flat = error.flatten();
  const fieldMessages = Object.values(flat.fieldErrors)
    .flat()
    .filter((msg): msg is string => Boolean(msg));
  const messages = [...flat.formErrors, ...fieldMessages];
  return messages[0] ?? "Invalid request payload";
}

function assertPaypalEnvironmentConsistency() {
  const baseUrl = env.paypalBaseUrl.toLowerCase();
  const isSandboxBase = baseUrl.includes("sandbox");
  const expectedEnv = (process.env.PAYPAL_ENV ?? process.env.NEXT_PUBLIC_PAYPAL_ENV ?? "")
    .trim()
    .toLowerCase();
  const publicClientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "").trim();
  const serverClientId = (process.env.PAYPAL_CLIENT_ID ?? "").trim();

  if (publicClientId && serverClientId && publicClientId !== serverClientId) {
    throw new Error("Mismatch: NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_ID must be from the same PayPal app");
  }

  if (!expectedEnv) {
    return;
  }

  if (expectedEnv === "sandbox" && !isSandboxBase) {
    throw new Error("Mismatch: PAYPAL_ENV is sandbox but PAYPAL_BASE_URL is live");
  }

  if ((expectedEnv === "live" || expectedEnv === "production") && isSandboxBase) {
    throw new Error("Mismatch: PAYPAL_ENV is live but PAYPAL_BASE_URL is sandbox");
  }
}

async function getPaypalToken() {
  const clientId = getRequiredEnv("PAYPAL_CLIENT_ID", env.paypalClientId);
  const clientSecret = getRequiredEnv("PAYPAL_CLIENT_SECRET", env.paypalClientSecret);

  const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${env.paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal token");
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function POST(request: Request) {
  try {
    const invalidOriginResponse = validateSameOrigin(request);
    if (invalidOriginResponse) {
      return invalidOriginResponse;
    }

    const invalidContentTypeResponse = validateJsonRequest(request);
    if (invalidContentTypeResponse) {
      return invalidContentTypeResponse;
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(request);

    const rateLimit = checkRateLimit({
      key: `paypal-capture:${session.user.id}:${clientIp}`,
      windowMs: 60_000,
      maxRequests: 8,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment confirmations. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json().catch(() => null);
    const parsed = paypalCaptureOrderSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const {
      paypalOrderId,
      customerName,
      customerEmail,
      phone,
      address,
      country,
    } = parsed.data;

    // Extract optional delivery fields from raw payload (not schema-validated, safe for NULL)
    const rawPayload = payload as Record<string, unknown>;
    const deliveryMethodId = rawPayload.delivery_method_id ? Number(rawPayload.delivery_method_id) : null;
    const deliveryFee = rawPayload.delivery_fee ? Number(rawPayload.delivery_fee) : 0;
    const deliveryNotes = typeof rawPayload.delivery_notes === "string" ? rawPayload.delivery_notes : null;
    const deliveryDataJson = typeof rawPayload.delivery_data_json === "string" ? rawPayload.delivery_data_json : null;

    assertPaypalEnvironmentConsistency();

    // Idempotency: if this PayPal order was already processed, return existing order.
    const existingByOrderId = await query<ExistingPayPalOrder[]>(
      "SELECT id, public_order_id, paypal_order_id, paypal_transaction_id FROM orders WHERE paypal_order_id = ? LIMIT 1",
      [paypalOrderId],
    );
    if (existingByOrderId.length > 0) {
      await query(
        `UPDATE paypal_checkout_sessions
         SET status = 'consumed', consumed_at = COALESCE(consumed_at, NOW())
         WHERE paypal_order_id = ?`,
        [paypalOrderId],
      );
      return NextResponse.json({
        ok: true,
        orderId: existingByOrderId[0].public_order_id,
        paymentId: paypalOrderId,
        transactionId: existingByOrderId[0].paypal_transaction_id,
        total: null,
        idempotent: true,
      });
    }

    const checkoutRows = await query<CheckoutSessionRow[]>(
      `SELECT id, paypal_order_id, user_id, currency, verified_total, items_json, status, created_at
       FROM paypal_checkout_sessions
       WHERE paypal_order_id = ? AND user_id = ?
       LIMIT 1`,
      [paypalOrderId, Number(session.user.id)],
    );

    if (checkoutRows.length === 0) {
      return NextResponse.json(
        { error: "Checkout session not found or expired" },
        { status: 400 },
      );
    }

    const checkoutSession = checkoutRows[0];
    if (checkoutSession.status !== "created") {
      return NextResponse.json(
        { error: "Checkout session already processed" },
        { status: 400 },
      );
    }

    const createdAtMs = new Date(checkoutSession.created_at).getTime();
    if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > CHECKOUT_SESSION_TTL_MS) {
      await query(
        `UPDATE paypal_checkout_sessions
         SET status = 'expired'
         WHERE id = ? AND status = 'created'`,
        [checkoutSession.id],
      );

      return NextResponse.json(
        { error: "Checkout session expired. Please start checkout again." },
        { status: 400 },
      );
    }

    const snapshotItemsParse = (() => {
      try {
        const parsedItems = JSON.parse(checkoutSession.items_json) as CheckoutSnapshotItem[];
        if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
          return null;
        }
        return parsedItems;
      } catch {
        return null;
      }
    })();

    if (!snapshotItemsParse) {
      return NextResponse.json(
        { error: "Invalid checkout session snapshot" },
        { status: 500 },
      );
    }

    const snapshotItems = snapshotItemsParse;

    // SECURITY: Verify product data from database (source of truth)
    // Frontend prices are for UX only; backend must validate
    const quantityByProduct = new Map<number, number>();
    for (const item of snapshotItems) {
      const normalizedQty = normalizePackageQty(Number(item.quantityPackages));
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) ?? 0) + normalizedQty,
      );
    }

    const productIds = Array.from(quantityByProduct.keys());

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "No valid products in order" },
        { status: 400 },
      );
    }

    // Fetch actual product prices from database (source of truth)
    const placeholders = productIds.map(() => "?").join(",");
    const productRows = await query<ProductPriceRow[]>(
      `SELECT id, name, image, price, transport_fee, stock_packages, package_name, unit_type, unit_value FROM products WHERE id IN (${placeholders})`,
      productIds,
    );

    if (productRows.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 404 },
      );
    }

    // Build verified price map from database
    const priceMap = new Map<number, ProductPriceRow>();
    productRows.forEach((row) => {
      priceMap.set(row.id, row);
    });

    // SECURITY: Calculate totals from server snapshot created at create-order time.
    let verifiedTotal = 0;
    for (const item of snapshotItems) {
      verifiedTotal += (Number(item.unitPrice) + Number(item.unitTransportFee)) * Number(item.quantityPackages);
    }
    verifiedTotal = Math.round(verifiedTotal * 100) / 100;

    const checkoutSessionTotal = Number(checkoutSession.verified_total);
    if (Math.abs(verifiedTotal - checkoutSessionTotal) > 0.01) {
      return NextResponse.json(
        { error: "Checkout snapshot total mismatch" },
        { status: 500 },
      );
    }

    // Check stock and calculate total against aggregated quantities
    for (const [productId, quantity] of quantityByProduct.entries()) {
      const dbProduct = priceMap.get(productId);
      if (!dbProduct) {
        return NextResponse.json(
          { error: `Product ${productId} not found in database` },
          { status: 404 },
        );
      }

      if (quantity > Number(dbProduct.stock_packages)) {
        return NextResponse.json(
          { error: `Insufficient package stock for ${dbProduct.name}` },
          { status: 400 },
        );
      }
    }

    // Build product info map for order snapshot
    const productInfo = new Map<number, { name: string; image: string }>(
      productRows.map((row) => [row.id, { name: row.name, image: row.image }]),
    );

    // CRITICAL: Capture order from PayPal
    const token = await getPaypalToken();
    const captureResponse = await fetch(
      `${env.paypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error("PayPal capture error:", errorText);
      return NextResponse.json(
        { error: "Failed to capture payment" },
        { status: 400 },
      );
    }

    const capturePayload = (await captureResponse.json()) as PaypalCaptureResponse;

    // Verify payment COMPLETED
    if (capturePayload.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed by PayPal" },
        { status: 400 },
      );
    }

    // Verify captured amount
    const capture = capturePayload.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.id || capture.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment capture is not completed" },
        { status: 400 },
      );
    }

    const amount = capture.amount ?? capturePayload.purchase_units?.[0]?.amount;
    if (!amount?.currency_code || amount.value === undefined) {
      return NextResponse.json(
        { error: "Missing payment amount details" },
        { status: 400 },
      );
    }

    if (amount.currency_code !== "USD") {
      return NextResponse.json(
        { error: "Unexpected payment currency" },
        { status: 400 },
      );
    }

    const paidAmount = Number(amount.value);
    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - verifiedTotal) > 0.01) {
      console.error(
        `Amount mismatch: paid=${paidAmount}, verified=${verifiedTotal}`,
      );
      return NextResponse.json(
        { error: "Paid amount does not match order total" },
        { status: 400 },
      );
    }

    // Get transaction ID
    const transactionId = capture.id;

    // Save order to database
    const userId = Number(session.user.id);
    const conn = await getConnection();
    let orderId = 0;
    let publicOrderId = "";

    try {
      await conn.beginTransaction();

      // Idempotency check inside transaction for concurrent requests.
      const [existingRowsRaw] = await conn.execute(
        `SELECT id, public_order_id, paypal_order_id, paypal_transaction_id
         FROM orders
         WHERE paypal_order_id = ? OR paypal_transaction_id = ?
         LIMIT 1
         FOR UPDATE`,
        [paypalOrderId, transactionId],
      );

      const existingRows = existingRowsRaw as ExistingPayPalOrder[];
      if (existingRows.length > 0) {
        await conn.execute(
          `UPDATE paypal_checkout_sessions
           SET status = 'consumed', consumed_at = NOW()
           WHERE id = ? AND status = 'created'`,
          [checkoutSession.id],
        );
        await conn.commit();
        return NextResponse.json({
          ok: true,
          orderId: existingRows[0].public_order_id,
          paymentId: paypalOrderId,
          transactionId: existingRows[0].paypal_transaction_id ?? transactionId,
          total: Number(verifiedTotal).toFixed(2),
          idempotent: true,
        });
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const nextPublicOrderId = generateOrderReference();

        try {
          // Determine the store_id from the first product in the snapshot.
          // All items in a single PayPal checkout session belong to one store
          // (multi-store carts go through /api/checkout/split instead).
          const firstProductId = snapshotItems[0]?.productId;
          let storeId = 1; // fallback to flagship store
          if (firstProductId) {
            const [storeRow] = await conn.execute(
              "SELECT store_id FROM products WHERE id = ? LIMIT 1",
              [firstProductId]
            ) as [{ store_id?: number }[], unknown];
            if (Array.isArray(storeRow) && storeRow[0]?.store_id) {
              storeId = Number(storeRow[0].store_id);
            }
          }

          const commissionRate = await WalletRepository.getCommissionRate(storeId);
          const grossSale = Number((verifiedTotal + deliveryFee).toFixed(2));
          const commissionAmount = Number(((verifiedTotal * commissionRate) / 100).toFixed(2));
          const vendorPayout = Number((grossSale - commissionAmount).toFixed(2));
          const masterOrderId = nextPublicOrderId; // 1:1 for direct single-store checkout

          const [insertOrderRaw] = await conn.execute(
            `INSERT INTO orders 
             (public_order_id, master_order_id, store_id, user_id, total_price,
              order_status, payment_status, payment_gateway,
              commission_amount, vendor_payout_amount,
              paypal_order_id, paypal_transaction_id,
              customer_name, customer_email, phone, address, country,
              delivery_method_id, delivery_fee, delivery_notes, delivery_data_json,
              created_at)
             VALUES (?, ?, ?, ?, ?, 'Payment Confirmed', 'Paid', 'paypal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              nextPublicOrderId,
              masterOrderId,
              storeId,
              userId,
              grossSale,
              commissionAmount,
              vendorPayout,
              paypalOrderId,
              transactionId,
              customerName || session.user.name || "Customer",
              customerEmail || session.user.email || "",
              phone || "",
              address || "",
              country || "",
              deliveryMethodId,
              deliveryFee,
              deliveryNotes,
              deliveryDataJson,
            ],
          );

          orderId = (insertOrderRaw as unknown as DbInsert).insertId;
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
        throw new Error("Failed to assign secure order reference");
      }

      for (const item of snapshotItems) {
        const productId = item.productId;
        const quantityPackages = normalizePackageQty(Number(item.quantityPackages));
        const dbProduct = priceMap.get(productId);
        const product = productInfo.get(productId);
        if (!dbProduct || !product) {
          throw new Error("Invalid product while saving order items");
        }

        await conn.execute(
          `INSERT INTO order_items 
           (order_id, product_id, quantity_packages, unit_type, unit_value, package_name, price, transport_fee, product_name_snapshot, product_image_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            productId,
            quantityPackages,
            dbProduct.unit_type === "kg" ? "kg" : "pcs",
            Number(dbProduct.unit_value ?? 1),
            dbProduct.package_name,
            Number(item.unitPrice),
            Number(item.unitTransportFee),
            product.name,
            product.image,
          ],
        );
      }

      for (const [productId, quantity] of quantityByProduct.entries()) {
        const [stockUpdateRaw] = await conn.execute(
          "UPDATE products SET stock_packages = stock_packages - ? WHERE id = ? AND stock_packages >= ?",
          [quantity, productId, quantity],
        );

        const stockUpdate = stockUpdateRaw as unknown as DbResult;
        if (stockUpdate.affectedRows !== 1) {
          throw new Error(`Insufficient stock while finalizing product ${productId}`);
        }
      }

      const [sessionUpdateRaw] = await conn.execute(
        `UPDATE paypal_checkout_sessions
         SET status = 'consumed', consumed_at = NOW()
         WHERE id = ? AND status = 'created'`,
        [checkoutSession.id],
      );

      const sessionUpdate = sessionUpdateRaw as unknown as DbResult;
      if (sessionUpdate.affectedRows !== 1) {
        throw new Error("Checkout session was already consumed");
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    await createAdminNotification({
      type: "order",
      title: `New order ${publicOrderId}`,
      body: `PayPal payment captured successfully (${Number(verifiedTotal).toFixed(2)} USD).`,
      link: "/admin/orders",
    });

    // Credit seller wallet immediately (webhook is secondary confirmation only).
    // This ensures sellers always see their earnings even if the webhook is delayed/missing.
    try {
      const [orderRow] = await query<{
        store_id: number;
        total_price: number;
        commission_amount: number;
      }[]>(
        "SELECT store_id, total_price, commission_amount FROM orders WHERE id = ? LIMIT 1",
        [orderId]
      );
      if (orderRow) {
        await WalletRepository.creditStoreSale(
          orderRow.store_id,
          Number(orderRow.total_price),
          Number(orderRow.commission_amount),
          publicOrderId
        );
      }

      // Record payment transaction for the admin dashboard
      await PaymentRepository.recordTransaction({
        master_order_id: publicOrderId,
        payment_gateway: "paypal",
        payment_reference: transactionId,
        transaction_status: "completed",
        amount: Number(verifiedTotal),
        currency: "USD",
        customer_id: userId,
      });
    } catch (walletErr) {
      // Non-fatal: webhook will retry crediting if this fails
      console.error("[capture-order] Wallet crediting error (non-fatal):", walletErr);
    }

    return NextResponse.json({
      ok: true,
      orderId: publicOrderId,
      paymentId: paypalOrderId,
      transactionId,
      total: Number(verifiedTotal).toFixed(2),
    });
  } catch (err) {
    console.error("Capture order error:", err);

    if (err && typeof err === "object") {
      const dbError = err as { code?: unknown; message?: unknown };
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

    return NextResponse.json(
      { error: "Unable to process payment. Please try again." },
      { status: 500 },
    );
  }
}
