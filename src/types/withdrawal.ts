export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED";

export type WithdrawalPaymentMethod =
  | "fapshi_mtn"
  | "fapshi_orange"
  | "fapshi_wallet"
  | "bank_transfer"
  | "paypal";

export interface WithdrawalRecord {
  id: number;
  store_id: number;
  user_id: number;
  wallet_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  payment_method: string;
  payout_details_json: string;
  recipient_phone: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  status: WithdrawalStatus;
  reference?: string | null;
  payout_reference?: string | null;
  fapshi_reference: string | null;
  fapshi_transaction_id: string | null;
  idempotency_key: string | null;
  failure_reason: string | null;

  admin_notes: string | null;
  processed_by: number | null;
  requested_at: string;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  updated_at: string;
  store_name?: string;
  store_slug?: string;
  user_name?: string;
  user_email?: string;
  processed_by_name?: string | null;
}

export interface WithdrawalSystemSettings {
  withdrawal_mode: "MANUAL" | "AUTO";
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  withdrawal_fee_fixed: number;
  withdrawal_fee_percentage: number;
  auto_max_amount: number;
  daily_user_limit: number;
  daily_global_limit: number;
}

export interface FapshiPayoutRequest {
  amount: number; // in XAF (integer, minimum 100)
  phone?: string; // 9-digit Cameroon number (e.g., 677123456)
  email?: string; // required if medium is "fapshi"
  medium: "mobile money" | "orange money" | "fapshi";
  externalId: string; // unique internal reference
  message?: string;
}

export interface FapshiPayoutResponse {
  message: string;
  transId?: string;
  dateInitiated?: string;
  statusCode?: number;
}

export interface WithdrawalAuditLog {
  id: number;
  withdrawal_id: number | null;
  actor_id: number | null;
  actor_role: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  amount: number | null;
  metadata_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
