import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";

type CheckoutSnapshotItem = {
  productId: number;
  quantityPackages: number;
  unitPrice: number;
  unitTransportFee: number;
  packageName: string;
  unitType: string;
  unitValue: number;
  storeId?: number;
};

const FAPSHI_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `fapshi-initiate:${session.user.id}:${clientIp}`,
      windowMs: 60_000,
      maxRequests: 6,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment requests. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      masterOrderId,
      customerEmail,
      cartItems,
      deliveryFee = 0,
      deliveryMethodId,
      deliveryDataJson,
    } = body as {
      masterOrderId: string;
      customerEmail: string;
      cartItems: CheckoutSnapshotItem[];
      deliveryFee?: number;
      deliveryMethodId?: number | null;
      deliveryDataJson?: string | null;
    };

    if (!masterOrderId || !customerEmail || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "masterOrderId, customerEmail, and cartItems are required" },
        { status: 400 }
      );
    }

    // Server-side price verification: fetch live prices from DB
    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const placeholders = productIds.map(() => "?").join(",");
    const dbProducts = await query<Array<{
      id: number;
      price: number;
      transport_fee: number;
      stock_packages: number;
    }>>(
      `SELECT id, price, transport_fee, stock_packages FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }

    const priceMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Calculate server-verified total in XAF (Fapshi uses XAF integer amounts)
    let verifiedTotalUSD = 0;
    for (const item of cartItems) {
      const db = priceMap.get(item.productId);
      if (!db) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      if (item.quantityPackages > db.stock_packages) {
        return NextResponse.json(
          { error: `Insufficient stock for product ${item.productId}` },
          { status: 400 }
        );
      }
      verifiedTotalUSD += (Number(db.price) + Number(db.transport_fee)) * item.quantityPackages;
    }
    verifiedTotalUSD = Math.round(verifiedTotalUSD * 100) / 100;
    const totalWithDelivery = verifiedTotalUSD + Number(deliveryFee);

    // Convert USD to XAF for Fapshi (approximate rate: 1 USD ≈ 600 XAF)
    // TODO: Replace with live exchange rate from an FX API in production
    const XAF_RATE = Number(process.env.USD_TO_XAF_RATE ?? 600);
    const amountXAF = Math.round(totalWithDelivery * XAF_RATE);

    if (amountXAF < 100) {
      return NextResponse.json({ error: "Amount too small for Fapshi payment" }, { status: 400 });
    }

    const redirectUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/checkout/fapshi-success?masterOrderId=${masterOrderId}`;

    // Create Fapshi payment request
    const fapshiResponse = await FapshiProvider.initiate({
      amount: amountXAF,
      email: customerEmail,
      externalId: masterOrderId,
      redirectUrl,
      message: `Bushfaller Order ${masterOrderId}`,
    });

    // Store session for idempotent order creation on success
    await query(
      `INSERT INTO fapshi_checkout_sessions
         (trans_id, user_id, master_order_id, currency, verified_total, items_json, delivery_data_json, status)
       VALUES (?, ?, ?, 'XAF', ?, ?, ?, 'created')
       ON DUPLICATE KEY UPDATE status = 'created'`,
      [
        fapshiResponse.transId,
        Number(session.user.id),
        masterOrderId,
        amountXAF,
        JSON.stringify(cartItems),
        deliveryDataJson || null,
      ]
    );

    return NextResponse.json({
      ok: true,
      transId: fapshiResponse.transId,
      link: fapshiResponse.link,
      amountXAF,
      amountUSD: totalWithDelivery.toFixed(2),
    });
  } catch (err: any) {
    console.error("[Fapshi Initiate] Error:", err);
    return NextResponse.json(
      { error: "Failed to initiate Fapshi payment. Please try again." },
      { status: 500 }
    );
  }
}
