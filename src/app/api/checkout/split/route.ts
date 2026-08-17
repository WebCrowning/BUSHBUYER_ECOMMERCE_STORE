import { auth } from "@/auth";
import { CheckoutService } from "@/services/checkout.service";
import { PaymentService } from "@/services/payment.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      items,
      customerName,
      customerEmail,
      phone,
      address,
      country,
      paymentGateway,
      delivery_method_id,
      delivery_fee,
      delivery_notes,
      delivery_data_json,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Execute Multi-Store Split Checkout
    const masterCheckout = await CheckoutService.createMasterOrder({
      user_id: Number(session.user.id),
      customer_name: customerName || session.user.name || "Customer",
      customer_email: customerEmail || session.user.email || "",
      phone: phone || "",
      address: address || "",
      country: country || "Cameroon",
      items: items.map((item: any) => ({
        product_id: item.productId || item.product_id,
        quantity_packages: item.quantityPackages || item.quantity_packages || 1,
        price: item.price,
        transport_fee: item.transportFee || item.transport_fee || 0,
        store_id: item.storeId || item.store_id || 1,
        unit_type: item.unitType || "pcs",
        unit_value: item.unitValue || 1.0,
        package_name: item.packageName || "pack",
        product_name_snapshot: item.name,
        product_image_snapshot: item.image,
      })),
      payment_gateway: paymentGateway || "paypal",
      delivery_method_id: delivery_method_id ? Number(delivery_method_id) : undefined,
      delivery_fee: delivery_fee ? Number(delivery_fee) : undefined,
      delivery_notes: delivery_notes || undefined,
      delivery_data_json: delivery_data_json || undefined,
    });


    // 2. Initiate Fapshi if selected
    if (paymentGateway === "fapshi") {
      // Convert USD total to XAF (Fapshi requires integer XAF amounts)
      const XAF_RATE = Number(process.env.USD_TO_XAF_RATE ?? 600);
      const amountXAF = Math.round(masterCheckout.total_amount * XAF_RATE);

      if (amountXAF < 100) {
        return NextResponse.json({ error: "Order amount too small for Fapshi payment (min 100 XAF)" }, { status: 400 });
      }

      const fapshiRes = await PaymentService.initiateFapshiPayment({
        amount: amountXAF,
        email: customerEmail || session.user.email || "",
        externalId: masterCheckout.master_order_id,
        redirectUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/orders/${masterCheckout.master_order_id}?payment=success`,
        message: `Order #${masterCheckout.master_order_id} Bushbuyer Payment`,
      });

      return NextResponse.json({
        success: true,
        master_order_id: masterCheckout.master_order_id,
        payment_gateway: "fapshi",
        payment_url: fapshiRes.link,
        trans_id: fapshiRes.transId,
        amount_xaf: amountXAF,
        amount_usd: masterCheckout.total_amount.toFixed(2),
      });
    }

    return NextResponse.json({
      success: true,
      master_order_id: masterCheckout.master_order_id,
      payment_gateway: "paypal",
      total_amount: masterCheckout.total_amount,
      sub_orders: masterCheckout.sub_orders,
    });
  } catch (err: any) {
    console.error("Split Checkout API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process checkout" }, { status: 500 });
  }
}
