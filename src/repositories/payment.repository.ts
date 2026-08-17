import { query } from "@/lib/db";
import { PaymentDashboardStats, PaymentTransactionRow } from "@/types/marketplace";

export class PaymentRepository {
  static async recordTransaction(data: {
    master_order_id: string;
    payment_gateway: string;
    payment_reference: string;
    transaction_status: "pending" | "completed" | "failed" | "refunded";
    amount: number;
    currency: string;
    store_id?: number | null;
    customer_id: number;
    gateway_fee?: number;
    metadata_json?: string | null;
  }): Promise<void> {
    await query(
      `INSERT INTO payment_transactions (
        master_order_id, payment_gateway, payment_reference, transaction_status, amount, currency, store_id, customer_id, gateway_fee, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        transaction_status = VALUES(transaction_status),
        metadata_json = VALUES(metadata_json)`,
      [
        data.master_order_id,
        data.payment_gateway,
        data.payment_reference,
        data.transaction_status,
        data.amount,
        data.currency || "USD",
        data.store_id || null,
        data.customer_id,
        data.gateway_fee || 0.0,
        data.metadata_json || null,
      ]
    );
  }

  static async updateTransactionStatus(
    paymentReference: string,
    status: "pending" | "completed" | "failed" | "refunded"
  ): Promise<void> {
    await query(
      "UPDATE payment_transactions SET transaction_status = ? WHERE payment_reference = ?",
      [status, paymentReference]
    );
  }

  static async logWebhook(
    gateway: string,
    eventId: string,
    eventType: string,
    payload: any
  ): Promise<boolean> {
    try {
      await query(
        `INSERT INTO payment_webhooks (gateway, event_id, event_type, payload_json, status)
         VALUES (?, ?, ?, ?, 'received')`,
        [gateway, eventId, eventType, JSON.stringify(payload)]
      );
      return true;
    } catch {
      return false; // Idempotent — duplicate event_id ignored
    }
  }

  static async getPaymentDashboardStats(): Promise<PaymentDashboardStats> {
    // Gateway volume totals
    const [volumeRows] = await query<Array<{
      payment_gateway: string;
      total_volume: number;
      volume_last_30: number;
    }>>(
      `SELECT
         payment_gateway,
         SUM(amount) AS total_volume,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL 30 DAY THEN amount ELSE 0 END) AS volume_last_30
       FROM payment_transactions
       WHERE transaction_status = 'completed'
       GROUP BY payment_gateway`
    ).then((rows) => [rows]);

    const paypalRow = volumeRows.find((r) => r.payment_gateway === "paypal");
    const fapshiRow = volumeRows.find((r) => r.payment_gateway === "fapshi");

    const paypalVolume = Number(paypalRow?.total_volume ?? 0);
    const paypalVolumeLast30 = Number(paypalRow?.volume_last_30 ?? 0);
    const fapshiVolume = Number(fapshiRow?.total_volume ?? 0);
    const fapshiVolumeLast30 = Number(fapshiRow?.volume_last_30 ?? 0);
    const totalRevenue = paypalVolume + fapshiVolume;

    // Commission totals from wallet_transactions
    const [commissionRow] = await query<Array<{
      total_commission: number;
      commission_last_30: number;
    }>>(
      `SELECT
         SUM(amount) AS total_commission,
         SUM(CASE WHEN created_at >= NOW() - INTERVAL 30 DAY THEN amount ELSE 0 END) AS commission_last_30
       FROM wallet_transactions
       WHERE transaction_type = 'commission'`
    );

    // Total seller payouts (net sales credited)
    const [payoutRow] = await query<Array<{ total_payouts: number }>>(
      `SELECT SUM(amount) AS total_payouts FROM wallet_transactions WHERE transaction_type = 'sale'`
    );

    // Pending withdrawals
    const [withdrawalRow] = await query<Array<{
      pending_count: number;
      pending_amount: number;
    }>>(
      `SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount), 0) AS pending_amount
       FROM withdrawals WHERE status = 'pending'`
    );

    // Recent 20 transactions with customer name
    const recentTransactions = await query<PaymentTransactionRow[]>(
      `SELECT pt.*, u.name AS customer_name
       FROM payment_transactions pt
       LEFT JOIN users u ON u.id = pt.customer_id
       ORDER BY pt.id DESC
       LIMIT 20`
    );

    // Gateway breakdown for donut chart
    const total = totalRevenue || 1; // avoid division by zero
    const gatewayBreakdown = {
      paypal: Math.round((paypalVolume / total) * 100),
      fapshi: Math.round((fapshiVolume / total) * 100),
    };

    return {
      totalRevenue,
      paypalVolume,
      paypalVolumeLast30,
      fapshiVolume,
      fapshiVolumeLast30,
      totalCommission: Number(commissionRow?.total_commission ?? 0),
      commissionLast30: Number(commissionRow?.commission_last_30 ?? 0),
      totalSellerPayouts: Number(payoutRow?.total_payouts ?? 0),
      pendingWithdrawalsCount: Number(withdrawalRow?.pending_count ?? 0),
      pendingWithdrawalsAmount: Number(withdrawalRow?.pending_amount ?? 0),
      recentTransactions,
      gatewayBreakdown,
    };
  }
}
