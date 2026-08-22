import { query } from "@/lib/db";
import { Commission, Wallet, WalletTransaction } from "@/types/marketplace";

export interface StoreWithdrawal {
  id: number;
  store_id: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export type { Wallet as StoreWallet };

export class WalletRepository {
  static async getByStoreId(storeId: number): Promise<Wallet | null> {
    const rows = await query<Wallet[]>("SELECT * FROM wallets WHERE store_id = ? LIMIT 1", [storeId]);
    return rows[0] || null;
  }

  static async getCommissionRate(storeId: number, category?: string): Promise<number> {
    // 1. Check Store Specific Commission
    const storeComm = await query<Commission[]>(
      "SELECT rate_percentage FROM commissions WHERE level = 'store' AND target_id = ? AND is_active = 1 LIMIT 1",
      [String(storeId)]
    );
    if (storeComm[0]) return Number(storeComm[0].rate_percentage);

    // 2. Check Category Specific Commission
    if (category) {
      const catComm = await query<Commission[]>(
        "SELECT rate_percentage FROM commissions WHERE level = 'category' AND target_id = ? AND is_active = 1 LIMIT 1",
        [category]
      );
      if (catComm[0]) return Number(catComm[0].rate_percentage);
    }

    // 3. Fallback to Global Commission
    const globalComm = await query<Commission[]>(
      "SELECT rate_percentage FROM commissions WHERE level = 'global' AND is_active = 1 LIMIT 1"
    );
    return globalComm[0] ? Number(globalComm[0].rate_percentage) : 10.0;
  }

  static async creditStoreSale(
    storeId: number,
    saleAmount: number,
    commissionAmount: number,
    orderId: string
  ): Promise<void> {
    const netPayout = saleAmount - commissionAmount;

    // Ensure wallet exists
    await query("INSERT INTO wallets (store_id) VALUES (?) ON DUPLICATE KEY UPDATE store_id=store_id", [storeId]);

    const wallet = await this.getByStoreId(storeId);
    if (!wallet) return;

    // Update wallet available balance & totals
    await query(
      `UPDATE wallets SET
        available_balance = available_balance + ?,
        total_sales = total_sales + ?,
        total_commission_paid = total_commission_paid + ?
       WHERE store_id = ?`,
      [netPayout, saleAmount, commissionAmount, storeId]
    );

    // Log Sale Transaction (net payout to seller)
    await query(
      `INSERT INTO wallet_transactions (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status)
       VALUES (?, ?, ?, 'sale', 'order', ?, ?, 'completed')`,
      [wallet.id, storeId, netPayout, orderId, `Net sale earnings from order #${orderId}`]
    );

    // Log Commission Ledger Entry (platform fee deducted)
    if (commissionAmount > 0) {
      await query(
        `INSERT INTO wallet_transactions (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status)
         VALUES (?, ?, ?, 'commission', 'order', ?, ?, 'completed')`,
        [wallet.id, storeId, commissionAmount, orderId, `Platform commission (${commissionAmount.toFixed(2)}) from order #${orderId}`]
      );
    }
  }

  static async recordRefund(
    storeId: number,
    refundAmount: number,
    orderId: string,
    reason?: string
  ): Promise<void> {
    const wallet = await this.getByStoreId(storeId);
    if (!wallet) throw new Error(`No wallet found for store ${storeId}`);

    // Deduct from available balance and increment total_refunds
    await query(
      `UPDATE wallets SET
        available_balance = available_balance - ?,
        total_refunds = COALESCE(total_refunds, 0) + ?
       WHERE store_id = ?`,
      [refundAmount, refundAmount, storeId]
    );

    // Log Refund Transaction
    await query(
      `INSERT INTO wallet_transactions (wallet_id, store_id, amount, transaction_type, reference_type, reference_id, description, status)
       VALUES (?, ?, ?, 'refund', 'order', ?, ?, 'completed')`,
      [wallet.id, storeId, refundAmount, orderId, reason || `Refund for order #${orderId}`]
    );
  }

  static async requestWithdrawal(
    storeId: number,
    userId: number,
    amount: number,
    paymentMethod: string,
    payoutDetails: any
  ): Promise<void> {
    const wallet = await this.getByStoreId(storeId);
    if (!wallet || wallet.available_balance < amount) {
      throw new Error("Insufficient available wallet balance");
    }

    // Deduct available balance and add to pending balance
    await query(
      `UPDATE wallets SET available_balance = available_balance - ?, pending_balance = pending_balance + ? WHERE store_id = ?`,
      [amount, amount, storeId]
    );

    await query(
      `INSERT INTO withdrawals (store_id, user_id, wallet_id, amount, payment_method, payout_details_json, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [storeId, userId, wallet.id, amount, paymentMethod, JSON.stringify(payoutDetails)]
    );
  }

  static async getWalletTransactions(storeId: number, limit = 50): Promise<WalletTransaction[]> {
    return query<WalletTransaction[]>(
      "SELECT * FROM wallet_transactions WHERE store_id = ? ORDER BY id DESC LIMIT ?",
      [storeId, limit]
    );
  }

  static async getWithdrawalsByStoreId(storeId: number, limit = 50): Promise<StoreWithdrawal[]> {
    return query<StoreWithdrawal[]>(
      "SELECT id, store_id, amount, payment_method, status, created_at FROM withdrawals WHERE store_id = ? ORDER BY id DESC LIMIT ?",
      [storeId, limit]
    );
  }
}
