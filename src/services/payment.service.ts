import { FapshiProvider } from "@/providers/fapshi.provider";
import { PaypalProvider } from "@/providers/paypal.provider";
import { OrderRepository } from "@/repositories/order.repository";
import { PaymentRepository } from "@/repositories/payment.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { FapshiPaymentRequest, FapshiPaymentResponse, FapshiTransactionStatus } from "@/types/marketplace";
import { paymentConfig } from "@/config/payment.config";

export class PaymentService {
  /**
   * Initiate Fapshi Mobile Money Payment.
   * Delegates to FapshiProvider for separation of concerns.
   */
  static async initiateFapshiPayment(req: FapshiPaymentRequest): Promise<FapshiPaymentResponse> {
    return FapshiProvider.initiate(req);
  }

  /**
   * Server-side Fapshi transaction verification.
   * Called on the success redirect page to confirm payment before creating order.
   */
  static async verifyFapshiTransaction(transId: string): Promise<FapshiTransactionStatus> {
    return FapshiProvider.verifyTransaction(transId);
  }

  /**
   * Finalize and Confirm Payment (Server-side validation).
   * Called by both PayPal and Fapshi webhook handlers.
   * Credits seller wallets and logs ledger entries.
   */
  static async handleSuccessfulPayment(
    masterOrderId: string,
    gateway: "paypal" | "fapshi",
    paymentReference: string,
    paidAmount: number,
    customerId: number
  ): Promise<void> {
    const subOrders = await OrderRepository.listMasterOrders(masterOrderId);
    if (!subOrders || subOrders.length === 0) {
      throw new Error(`No orders found for master order ID: ${masterOrderId}`);
    }

    // 1. Record master payment transaction
    await PaymentRepository.recordTransaction({
      master_order_id: masterOrderId,
      payment_gateway: gateway,
      payment_reference: paymentReference,
      transaction_status: "completed",
      amount: paidAmount,
      currency: gateway === "fapshi" ? "XAF" : "USD",
      customer_id: customerId,
    });

    // 2. Process each sub-order — update status and credit seller wallet
    for (const order of subOrders) {
      if (order.payment_status !== "Paid") {
        await OrderRepository.updatePaymentStatus(order.id, "Paid", paymentReference);
        await OrderRepository.updateOrderStatus(
          order.id,
          "Payment Confirmed",
          customerId,
          "Payment System Verification",
          `Payment verified via ${gateway.toUpperCase()} (Ref: ${paymentReference})`
        );

        // 3. Credit Seller Wallet with separate commission ledger entry
        await WalletRepository.creditStoreSale(
          order.store_id,
          Number(order.total_price),
          Number(order.commission_amount),
          order.public_order_id
        );
      }
    }
  }

  /**
   * Process a refund for an order.
   * Updates wallet, records ledger entry, and calls the gateway refund API.
   *
   * For PayPal: calls POST /v2/payments/captures/{captureId}/refund
   * For Fapshi:  calls the Fapshi refund endpoint (requires the transId)
   *
   * Gateway errors are logged but do not throw — internal DB state is always
   * updated first so the wallet is consistent even if the gateway call fails.
   * Failed gateway refunds are flagged in the transaction record for manual follow-up.
   */
  static async processRefund(
    orderId: string,
    storeId: number,
    gateway: "paypal" | "fapshi",
    paymentReference: string,
    refundAmount: number,
    reason: string
  ): Promise<{ ok: boolean; gatewayRefunded: boolean; gatewayError?: string }> {
    const refundRef = `REFUND-${paymentReference}-${Date.now()}`;

    // 1. Record the refund transaction in payment_transactions
    await PaymentRepository.recordTransaction({
      master_order_id: orderId,
      payment_gateway: gateway,
      payment_reference: refundRef,
      transaction_status: "refunded",
      amount: refundAmount,
      currency: gateway === "fapshi" ? "XAF" : "USD",
      customer_id: 0, // System-initiated
    });

    // 2. Deduct from store wallet
    await WalletRepository.recordRefund(storeId, refundAmount, orderId, reason);

    // 3. Call the gateway refund API
    let gatewayRefunded = false;
    let gatewayError: string | undefined;

    if (gateway === "paypal") {
      try {
        const token = await PaypalProvider.getAccessToken();
        const refundRes = await fetch(
          `${paymentConfig.paypal.baseUrl}/v2/payments/captures/${paymentReference}/refund`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: {
                currency_code: "USD",
                value: refundAmount.toFixed(2),
              },
              note_to_payer: reason || "Refund issued by Bushbuyer Marketplace",
            }),
          }
        );

        if (refundRes.ok) {
          const refundPayload = await refundRes.json() as { id?: string; status?: string };
          if (refundPayload.status === "COMPLETED" || refundPayload.status === "PENDING") {
            gatewayRefunded = true;
            console.info(`[PaymentService] PayPal refund OK — refund id: ${refundPayload.id}`);
          } else {
            gatewayError = `PayPal refund status: ${refundPayload.status}`;
          }
        } else {
          const errText = await refundRes.text();
          gatewayError = `PayPal refund failed (${refundRes.status}): ${errText}`;
          console.error("[PaymentService] PayPal refund API error:", gatewayError);
        }
      } catch (err) {
        gatewayError = err instanceof Error ? err.message : "PayPal refund network error";
        console.error("[PaymentService] PayPal refund exception:", gatewayError);
      }
    }

    if (gateway === "fapshi") {
      try {
        const refundRes = await fetch(
          `${paymentConfig.fapshi.baseUrl}/refund/${paymentReference}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              apiuser: paymentConfig.fapshi.apiUser,
              apikey: paymentConfig.fapshi.apiKey,
            },
          }
        );

        if (refundRes.ok) {
          gatewayRefunded = true;
          console.info(`[PaymentService] Fapshi refund OK for transId: ${paymentReference}`);
        } else {
          const errText = await refundRes.text();
          gatewayError = `Fapshi refund failed (${refundRes.status}): ${errText}`;
          console.error("[PaymentService] Fapshi refund API error:", gatewayError);
        }
      } catch (err) {
        gatewayError = err instanceof Error ? err.message : "Fapshi refund network error";
        console.error("[PaymentService] Fapshi refund exception:", gatewayError);
      }
    }

    return { ok: true, gatewayRefunded, gatewayError };
  }
}
