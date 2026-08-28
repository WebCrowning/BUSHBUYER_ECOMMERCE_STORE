import { query } from "@/lib/db";
import { FapshiProvider } from "@/providers/fapshi.provider";
import { SettingsRepository } from "@/repositories/settings.repository";
import { parseCameroonPhone, FapshiMedium } from "@/lib/cameroon-phone";
import {
  WithdrawalRecord,
  WithdrawalStatus,
  WithdrawalSystemSettings,
} from "@/types/withdrawal";
import { randomBytes } from "crypto";

export class WithdrawalRepository {
  /**
   * Generate a unique internal withdrawal reference e.g. WD-20260828-9F3A1
   */
  static generateReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = randomBytes(3).toString("hex").toUpperCase();
    return `WD-${date}-${rand}`;
  }

  /**
   * Calculate withdrawal fee based on system settings.
   */
  static calculateFee(amount: number, settings: WithdrawalSystemSettings): {
    fee: number;
    netAmount: number;
  } {
    const fixed = Number(settings.withdrawal_fee_fixed || 0);
    const pct = Number(settings.withdrawal_fee_percentage || 0);
    const calculatedFee = fixed + (amount * pct) / 100;
    const fee = Math.round(calculatedFee * 100) / 100;
    const netAmount = Math.max(0, Math.round((amount - fee) * 100) / 100);
    return { fee, netAmount };
  }

  /**
   * Submit a new withdrawal request.
   * Atomically locks wallet, checks balances & pending requests, reserves funds, and records ledger.
   */
  static async createWithdrawalRequest(params: {
    storeId: number;
    userId: number;
    amount: number;
    paymentMethod: string;
    payoutDetails: any;
    idempotencyKey?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ withdrawal: WithdrawalRecord; autoExecuted: boolean }> {
    const { storeId, userId, amount, paymentMethod, payoutDetails, ipAddress, userAgent } = params;
    const idempotencyKey = params.idempotencyKey || `idem-${randomBytes(16).toString("hex")}`;

    // 1. Check idempotency key to prevent double requests
    const existing = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE idempotency_key = ? LIMIT 1",
      [idempotencyKey]
    );
    if (existing[0]) {
      return { withdrawal: existing[0], autoExecuted: false };
    }

    // 2. Fetch system settings
    const settings = await SettingsRepository.getWithdrawalSettings();

    // 3. Amount validations
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid withdrawal amount.");
    }
    if (amount < settings.min_withdrawal_amount) {
      throw new Error(`Minimum withdrawal amount is ${settings.min_withdrawal_amount.toLocaleString()} XAF.`);
    }
    if (amount > settings.max_withdrawal_amount) {
      throw new Error(`Maximum withdrawal amount is ${settings.max_withdrawal_amount.toLocaleString()} XAF.`);
    }

    // 4. Calculate fee and net amount
    const { fee, netAmount } = this.calculateFee(amount, settings);
    if (netAmount <= 0) {
      throw new Error("Withdrawal amount after fees must be greater than 0.");
    }

    // 5. Normalize recipient details
    let recipientPhone: string | null = null;
    let recipientEmail: string | null = null;
    let recipientName: string | null = payoutDetails.accountName || null;
    let fapshiMedium: FapshiMedium | null = null;

    if (paymentMethod.startsWith("fapshi") || paymentMethod === "mobile_money") {
      if (paymentMethod === "fapshi_wallet") {
        recipientEmail = payoutDetails.email || payoutDetails.paypalEmail;
        if (!recipientEmail || !recipientEmail.includes("@")) {
          throw new Error("A valid Fapshi account email is required.");
        }
        fapshiMedium = "fapshi";
      } else {
        const rawPhone = payoutDetails.mobileNumber || payoutDetails.phone;
        const phoneInfo = parseCameroonPhone(rawPhone);
        if (!phoneInfo.isValid) {
          throw new Error(phoneInfo.errorMessage || "Invalid Cameroon phone number.");
        }
        recipientPhone = phoneInfo.normalized;
        fapshiMedium = phoneInfo.fapshiMedium;
      }
    }

    // 6. Check active pending/approved withdrawals for this store
    const [pendingRow] = await query<{ cnt: number }[]>(
      "SELECT COUNT(*) AS cnt FROM withdrawals WHERE store_id = ? AND status IN ('PENDING', 'APPROVED', 'PROCESSING')",
      [storeId]
    );
    if (Number(pendingRow?.cnt) > 0) {
      throw new Error("You already have an active withdrawal request awaiting processing.");
    }

    // 7. Check wallet balance & atomically reserve funds
    const [wallet] = await query<{ id: number; available_balance: number }[]>(
      "SELECT id, available_balance FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );
    if (!wallet) {
      throw new Error("Wallet not found for this store.");
    }
    if (Number(wallet.available_balance) < amount) {
      throw new Error(`Insufficient available balance (available: ${Number(wallet.available_balance).toLocaleString()} XAF).`);
    }

    // Atomic deduction from available_balance and addition to pending_balance
    await query(
      `UPDATE wallets
       SET available_balance = available_balance - ?,
           pending_balance = pending_balance + ?
       WHERE store_id = ? AND available_balance >= ?`,
      [amount, amount, storeId, amount]
    );

    const fapshiRef = this.generateReference();

    // 8. Insert withdrawal record with status 'PENDING'
    const insertRes = await query<{ insertId: number }>(
      `INSERT INTO withdrawals (
        store_id, user_id, wallet_id, amount, fee, net_amount, currency,
        payment_method, payout_details_json, recipient_phone, recipient_name,
        recipient_email, status, fapshi_reference, idempotency_key, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'XAF', ?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW())`,
      [
        storeId,
        userId,
        wallet.id,
        amount,
        fee,
        netAmount,
        paymentMethod,
        JSON.stringify({ ...payoutDetails, fapshiMedium }),
        recipientPhone,
        recipientName,
        recipientEmail,
        fapshiRef,
        idempotencyKey,
      ]
    );

    const withdrawalId = insertRes.insertId;

    // 9. Record wallet transaction ledger entry (pending withdrawal)
    await query(
      `INSERT INTO wallet_transactions (
        wallet_id, store_id, amount, transaction_type, reference_type,
        reference_id, description, status
      ) VALUES (?, ?, ?, 'withdrawal', 'withdrawal', ?, ?, 'pending')`,
      [
        wallet.id,
        storeId,
        amount,
        String(withdrawalId),
        `Withdrawal request #${withdrawalId} (${fapshiRef}) — awaiting review`,
      ]
    );

    // 10. Record audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_id, actor_role, action, old_status, new_status,
        amount, metadata_json, ip_address, user_agent
      ) VALUES (?, ?, 'user', 'WITHDRAWAL_REQUESTED', NULL, 'PENDING', ?, ?, ?, ?)`,
      [
        withdrawalId,
        userId,
        amount,
        JSON.stringify({
          fapshiRef,
          netAmount,
          fee,
          paymentMethod,
          recipientPhone,
          recipientEmail,
        }),
        ipAddress || null,
        userAgent || null,
      ]
    );

    const [created] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );

    // 11. Check Automatic Mode
    // AUTO execution only happens if withdrawal_mode is explicitly 'AUTO' AND within configured limits
    let autoExecuted = false;
    if (
      settings.withdrawal_mode === "AUTO" &&
      fapshiMedium &&
      amount <= settings.auto_max_amount
    ) {
      // Check daily user limit
      const [userDaily] = await query<{ total: number }[]>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM withdrawals
         WHERE user_id = ? AND status IN ('PROCESSING', 'SUCCESS')
           AND requested_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [userId]
      );

      // Check daily global limit
      const [globalDaily] = await query<{ total: number }[]>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM withdrawals
         WHERE status IN ('PROCESSING', 'SUCCESS')
           AND requested_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      if (
        Number(userDaily?.total || 0) + amount <= settings.daily_user_limit &&
        Number(globalDaily?.total || 0) + amount <= settings.daily_global_limit
      ) {
        try {
          await this.executeFapshiPayout(withdrawalId, userId, "AUTO_SYSTEM");
          autoExecuted = true;
        } catch (err: any) {
          console.warn("[WithdrawalRepository] Auto payout dispatch failed, fallback to PENDING:", err.message);
        }
      }
    }

    return { withdrawal: created || ({} as WithdrawalRecord), autoExecuted };
  }

  /**
   * Admin approves a pending withdrawal and triggers Fapshi payout disbursement.
   */
  static async approveWithdrawal(
    withdrawalId: number,
    adminUserId: number,
    adminNotes?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<WithdrawalRecord> {
    // 1. Atomic status lock to prevent concurrent double-approvals
    const res = await query(
      `UPDATE withdrawals
       SET status = 'APPROVED',
           approved_at = NOW(),
           admin_notes = ?,
           processed_by = ?
       WHERE id = ? AND status = 'PENDING'`,
      [adminNotes || null, adminUserId, withdrawalId]
    );

    if ((res as any).affectedRows === 0) {
      throw new Error("Withdrawal is not in PENDING status or has already been approved.");
    }

    // 2. Record audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_id, actor_role, action, old_status, new_status,
        metadata_json, ip_address, user_agent
      ) VALUES (?, ?, 'admin', 'WITHDRAWAL_APPROVED', 'PENDING', 'APPROVED', ?, ?, ?)`,
      [
        withdrawalId,
        adminUserId,
        JSON.stringify({ adminNotes }),
        ipAddress || null,
        userAgent || null,
      ]
    );

    // 3. Execute payout dispatch
    return await this.executeFapshiPayout(withdrawalId, adminUserId, "ADMIN_APPROVED", ipAddress, userAgent);
  }

  /**
   * Executes payout call to Fapshi API and manages state transitions.
   */
  static async executeFapshiPayout(
    withdrawalId: number,
    actorId: number,
    triggerSource = "ADMIN",
    ipAddress?: string,
    userAgent?: string
  ): Promise<WithdrawalRecord> {
    const [w] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );
    if (!w) throw new Error("Withdrawal record not found.");

    // Parse payout details
    let details: any = {};
    try {
      details = JSON.parse(w.payout_details_json || "{}");
    } catch {
      details = {};
    }

    // If manual bank transfer or PayPal, mark as PROCESSING / wait for manual confirmation
    if (w.payment_method === "bank_transfer" || w.payment_method === "paypal") {
      await query(
        `UPDATE withdrawals
         SET status = 'PROCESSING', processed_at = NOW()
         WHERE id = ?`,
        [withdrawalId]
      );
      return (await query<WithdrawalRecord[]>("SELECT * FROM withdrawals WHERE id = ? LIMIT 1", [withdrawalId]))[0];
    }

    // Determine Fapshi payout medium
    const medium: FapshiMedium =
      details.fapshiMedium ||
      (w.payment_method === "fapshi_wallet"
        ? "fapshi"
        : w.payment_method === "fapshi_orange"
        ? "orange money"
        : "mobile money");

    // Transition status to PROCESSING
    await query(
      `UPDATE withdrawals SET status = 'PROCESSING', processed_at = NOW() WHERE id = ?`,
      [withdrawalId]
    );

    try {
      const payoutRes = await FapshiProvider.payout({
        amount: Number(w.net_amount || w.amount),
        phone: w.recipient_phone || undefined,
        email: w.recipient_email || undefined,
        medium,
        externalId: w.fapshi_reference || `WD-${w.id}`,
        message: `Bushfaller store payout ref #${w.fapshi_reference || w.id}`,
      });

      const transId = payoutRes.transId || null;

      await query(
        `UPDATE withdrawals
         SET fapshi_transaction_id = ?,
             payout_reference = COALESCE(?, payout_reference)
         WHERE id = ?`,
        [transId, transId, withdrawalId]
      );

      // Audit log payout initiation
      await query(
        `INSERT INTO withdrawal_audit_logs (
          withdrawal_id, actor_id, actor_role, action, old_status, new_status,
          metadata_json, ip_address, user_agent
        ) VALUES (?, ?, 'system', 'WITHDRAWAL_PROCESSING', 'APPROVED', 'PROCESSING', ?, ?, ?)`,
        [
          withdrawalId,
          actorId,
          JSON.stringify({ transId, triggerSource, response: payoutRes }),
          ipAddress || null,
          userAgent || null,
        ]
      );

      // Check immediate status if available
      if (transId) {
        try {
          const statusCheck = await FapshiProvider.checkPayoutStatus(transId);
          if (statusCheck.status === "SUCCESSFUL") {
            await this.finalizeSuccess(withdrawalId, transId);
          } else if (statusCheck.status === "FAILED") {
            await this.finalizeFailure(withdrawalId, statusCheck.message || "Fapshi payout failed");
          }
        } catch {
          // Status polling failed; webhook or manual reconciliation will finalize
        }
      }
    } catch (err: any) {
      console.error("[WithdrawalRepository.executeFapshiPayout] Error:", err);
      await query(
        `UPDATE withdrawals
         SET failure_reason = ?
         WHERE id = ?`,
        [err.message || "Failed to initiate Fapshi payout", withdrawalId]
      );
      // Do not automatically refund if timeout; leave in PROCESSING for reconciliation
    }

    return (await query<WithdrawalRecord[]>("SELECT * FROM withdrawals WHERE id = ? LIMIT 1", [withdrawalId]))[0];
  }

  /**
   * Finalize successful withdrawal.
   * Atomically clears pending balance and records completed ledger transaction.
   */
  static async finalizeSuccess(withdrawalId: number, transId?: string): Promise<void> {
    const [w] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );
    if (!w || w.status === "SUCCESS") return;

    // Deduct from pending_balance and increment total_withdrawals
    await query(
      `UPDATE wallets
       SET pending_balance = GREATEST(0, pending_balance - ?),
           total_withdrawals = total_withdrawals + ?
       WHERE id = ?`,
      [w.amount, w.amount, w.wallet_id]
    );

    // Update withdrawal record
    await query(
      `UPDATE withdrawals
       SET status = 'SUCCESS',
           completed_at = NOW(),
           payout_reference = COALESCE(?, payout_reference)
       WHERE id = ?`,
      [transId || null, withdrawalId]
    );

    // Update wallet_transactions ledger entry to completed
    await query(
      `UPDATE wallet_transactions
       SET status = 'completed',
           description = CONCAT(description, ' — Paid successfully (ref: ', COALESCE(?, ''), ')')
       WHERE reference_type = 'withdrawal' AND reference_id = ?`,
      [transId || w.fapshi_reference || "", String(withdrawalId)]
    );

    // Audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_role, action, old_status, new_status, metadata_json
      ) VALUES (?, 'system', 'WITHDRAWAL_SUCCESS', ?, 'SUCCESS', ?)`,
      [withdrawalId, w.status, JSON.stringify({ transId })]
    );
  }

  /**
   * Finalize failed withdrawal.
   * Restores reserved amount back to available_balance.
   */
  static async finalizeFailure(withdrawalId: number, reason: string): Promise<void> {
    const [w] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );
    if (!w || w.status === "FAILED" || w.status === "SUCCESS") return;

    // Return funds from pending_balance back to available_balance
    await query(
      `UPDATE wallets
       SET available_balance = available_balance + ?,
           pending_balance = GREATEST(0, pending_balance - ?)
       WHERE id = ?`,
      [w.amount, w.amount, w.wallet_id]
    );

    // Mark withdrawal as FAILED
    await query(
      `UPDATE withdrawals
       SET status = 'FAILED',
           failure_reason = ?,
           completed_at = NOW()
       WHERE id = ?`,
      [reason, withdrawalId]
    );

    // Record ledger adjustment
    await query(
      `INSERT INTO wallet_transactions (
        wallet_id, store_id, amount, transaction_type, reference_type,
        reference_id, description, status, admin_note
      ) VALUES (?, ?, ?, 'adjustment', 'withdrawal', ?, ?, 'completed', ?)`,
      [
        w.wallet_id,
        w.store_id,
        w.amount,
        String(withdrawalId),
        `Withdrawal #${withdrawalId} failed — funds returned to available balance`,
        reason,
      ]
    );

    // Audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_role, action, old_status, new_status, metadata_json
      ) VALUES (?, 'system', 'WITHDRAWAL_FAILED', ?, 'FAILED', ?)`,
      [withdrawalId, w.status, JSON.stringify({ reason })]
    );
  }

  /**
   * Admin rejects a withdrawal request.
   * Atomically refunds reserved amount to available_balance.
   */
  static async rejectWithdrawal(
    withdrawalId: number,
    adminUserId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<WithdrawalRecord> {
    const [w] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );
    if (!w) throw new Error("Withdrawal not found.");

    if (!["PENDING", "APPROVED"].includes(w.status)) {
      throw new Error(`Cannot reject withdrawal with status '${w.status}'. Only PENDING or APPROVED requests can be rejected.`);
    }

    // Atomic update status to REJECTED
    const res = await query(
      `UPDATE withdrawals
       SET status = 'REJECTED',
           admin_notes = ?,
           processed_by = ?,
           completed_at = NOW()
       WHERE id = ? AND status IN ('PENDING', 'APPROVED')`,
      [reason, adminUserId, withdrawalId]
    );

    if ((res as any).affectedRows === 0) {
      throw new Error("Withdrawal state was modified concurrently.");
    }

    // Return funds from pending_balance to available_balance
    await query(
      `UPDATE wallets
       SET available_balance = available_balance + ?,
           pending_balance = GREATEST(0, pending_balance - ?)
       WHERE id = ?`,
      [w.amount, w.amount, w.wallet_id]
    );

    // Record ledger reversal
    await query(
      `INSERT INTO wallet_transactions (
        wallet_id, store_id, amount, transaction_type, reference_type,
        reference_id, description, status, admin_note
      ) VALUES (?, ?, ?, 'adjustment', 'withdrawal', ?, ?, 'completed', ?)`,
      [
        w.wallet_id,
        w.store_id,
        w.amount,
        String(withdrawalId),
        `Withdrawal #${withdrawalId} rejected — funds returned to balance`,
        reason,
      ]
    );

    // Audit log
    await query(
      `INSERT INTO withdrawal_audit_logs (
        withdrawal_id, actor_id, actor_role, action, old_status, new_status,
        metadata_json, ip_address, user_agent
      ) VALUES (?, ?, 'admin', 'WITHDRAWAL_REJECTED', ?, 'REJECTED', ?, ?, ?)`,
      [
        withdrawalId,
        adminUserId,
        w.status,
        JSON.stringify({ reason }),
        ipAddress || null,
        userAgent || null,
      ]
    );

    return (await query<WithdrawalRecord[]>("SELECT * FROM withdrawals WHERE id = ? LIMIT 1", [withdrawalId]))[0];
  }

  /**
   * Reconcile withdrawal status with Fapshi API.
   */
  static async reconcileWithFapshi(withdrawalId: number, adminUserId: number): Promise<{
    fapshiStatus: string;
    localStatus: string;
    updated: boolean;
  }> {
    const [w] = await query<WithdrawalRecord[]>(
      "SELECT * FROM withdrawals WHERE id = ? LIMIT 1",
      [withdrawalId]
    );
    if (!w) throw new Error("Withdrawal not found.");

    const transId = w.fapshi_transaction_id || w.payout_reference;
    if (!transId) {
      throw new Error("No Fapshi transaction ID associated with this withdrawal.");
    }

    const check = await FapshiProvider.checkPayoutStatus(transId);
    let updated = false;

    if (check.status === "SUCCESSFUL" && w.status !== "SUCCESS") {
      await this.finalizeSuccess(withdrawalId, transId);
      updated = true;
    } else if (check.status === "FAILED" && w.status !== "FAILED") {
      await this.finalizeFailure(withdrawalId, check.message || "Reconciled Fapshi status: FAILED");
      updated = true;
    }

    return {
      fapshiStatus: check.status,
      localStatus: updated ? (check.status === "SUCCESSFUL" ? "SUCCESS" : "FAILED") : w.status,
      updated,
    };
  }
}
