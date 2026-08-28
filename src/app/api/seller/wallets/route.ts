import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStoreOrAdminApi } from "@/lib/authz";
import { WithdrawalRepository } from "@/repositories/withdrawal.repository";
import { SettingsRepository } from "@/repositories/settings.repository";
import { z } from "zod";

type WalletRow = {
  id: number;
  store_id: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  total_refunds: number;
  total_commission_paid: number;
  total_sales: number;
  currency: string;
  updated_at: string;
};

type TransactionRow = {
  id: number;
  wallet_id: number;
  store_id: number;
  amount: number;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type WithdrawalRow = {
  id: number;
  store_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  payment_method: string;
  payout_details_json: string;
  recipient_phone: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  status: string;
  reference: string | null;
  payout_reference: string | null;
  fapshi_reference: string | null;
  fapshi_transaction_id: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
};

const withdrawalSchema = z.object({
  storeId: z.number().int().positive(),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(
    ["fapshi_mtn", "fapshi_orange", "fapshi_wallet", "bank_transfer", "paypal", "fapshi"],
    { error: "Invalid payment method" }
  ),
  payoutDetails: z.object({
    accountName: z.string().min(2).optional(),
    accountNumber: z.string().min(4).optional(),
    bankName: z.string().optional(),
    mobileNumber: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    paypalEmail: z.string().email().optional(),
    notes: z.string().max(300).optional(),
  }).optional().default({}),
  idempotencyKey: z.string().max(120).optional(),
});

/**
 * GET /api/seller/wallets?storeId=<id>
 * Returns wallet balance, recent transactions (last 100), withdrawal history, and active withdrawal settings.
 */
export async function GET(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const overrideId = searchParams.get("storeId");
  const storeId = overrideId ? parseInt(overrideId, 10) : access.primaryStoreId;

  if (!storeId || isNaN(storeId)) {
    return NextResponse.json({ error: "No store found for your account" }, { status: 400 });
  }

  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Wallet balance
    const [wallet] = await query<WalletRow[]>(
      "SELECT * FROM wallets WHERE store_id = ? LIMIT 1",
      [storeId]
    );

    // 2. Recent transactions (last 100)
    const transactions = await query<TransactionRow[]>(
      `SELECT id, wallet_id, store_id, amount, transaction_type, reference_type,
              reference_id, description, status, admin_note, created_at
       FROM wallet_transactions
       WHERE store_id = ?
       ORDER BY id DESC LIMIT 100`,
      [storeId]
    );

    // 3. Withdrawal history
    const withdrawals = await query<WithdrawalRow[]>(
      `SELECT id, store_id, amount, COALESCE(fee, 0) AS fee, COALESCE(net_amount, amount) AS net_amount,
              COALESCE(currency, 'XAF') AS currency, payment_method, payout_details_json,
              recipient_phone, recipient_name, recipient_email, UPPER(status) AS status,
              reference, payout_reference, fapshi_reference, fapshi_transaction_id,
              failure_reason, admin_notes, processed_at, created_at
       FROM withdrawals
       WHERE store_id = ?
       ORDER BY id DESC LIMIT 50`,
      [storeId]
    );

    // 4. Commission rate for this store (informational)
    const [commissionRow] = await query<{ rate_percentage: number }[]>(
      `SELECT rate_percentage FROM commissions
       WHERE (level = 'store' AND target_id = ? AND is_active = 1)
       UNION ALL
       SELECT rate_percentage FROM commissions
       WHERE level = 'global' AND is_active = 1
       LIMIT 1`,
      [String(storeId)]
    );

    // 5. Active withdrawal settings (limits, fees)
    const withdrawalSettings = await SettingsRepository.getWithdrawalSettings();

    return NextResponse.json({
      wallet: wallet ?? null,
      transactions,
      withdrawals,
      commissionRate: commissionRow?.rate_percentage ?? 5.0,
      withdrawalSettings,
    });
  } catch (err) {
    console.error("Seller wallets GET error:", err);
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 });
  }
}

/**
 * POST /api/seller/wallets
 * Submit a withdrawal request.
 * Only store_owner role (and platform admins) can withdraw.
 */
export async function POST(request: Request) {
  const access = await requireStoreOrAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const userId = access.userId;
  const role = access.role as string;

  // Only store owners (and platform admins) may request withdrawals
  const canWithdraw =
    access.isSuperAdmin ||
    role === "store_owner" ||
    role === "admin" ||
    role === "finance_admin";

  if (!canWithdraw) {
    return NextResponse.json(
      { error: "Only store owners can request withdrawals" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = withdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { storeId, amount, paymentMethod, payoutDetails, idempotencyKey } = parsed.data;

  // Verify requester belongs to this store
  if (!access.isSuperAdmin && !access.userStoreIds.includes(storeId)) {
    return NextResponse.json({ error: "Forbidden: this store is not yours" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const { withdrawal, autoExecuted } = await WithdrawalRepository.createWithdrawalRequest({
      storeId,
      userId,
      amount,
      paymentMethod,
      payoutDetails,
      idempotencyKey,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json(
      {
        ok: true,
        withdrawalId: withdrawal.id,
        withdrawal,
        autoExecuted,
        message: autoExecuted
          ? "Withdrawal processed automatically via Fapshi."
          : "Withdrawal request submitted. An admin will review and approve it shortly.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Seller wallets POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit withdrawal request" }, { status: 400 });
  }
}
