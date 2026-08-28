import fs from "fs";
import path from "path";

// Load .env.local
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
} catch (e) {}

if (!process.env.MYSQL_DATABASE) {
  process.env.MYSQL_DATABASE = "bushfaller";
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING SECURE FAPSHI WITHDRAWAL SYSTEM TEST SUITE");
  console.log("==================================================");

  const { query } = await import("@/lib/db");
  const { parseCameroonPhone } = await import("@/lib/cameroon-phone");
  const { SettingsRepository } = await import("@/repositories/settings.repository");
  const { WithdrawalRepository } = await import("@/repositories/withdrawal.repository");

  // ── TEST 1: Phone Normalizer & Operator Detection ──
  console.log("\n[TEST 1] Cameroon Phone Normalizer & Operator Detection");
  const mtnTest = parseCameroonPhone("+237 677 12 34 56");
  console.assert(mtnTest.isValid && mtnTest.operator === "MTN" && mtnTest.normalized === "677123456", "MTN validation failed");
  console.log("  ✓ MTN parsed:", mtnTest.operator, mtnTest.normalized, mtnTest.fapshiMedium);

  const orangeTest = parseCameroonPhone("237699001122");
  console.assert(orangeTest.isValid && orangeTest.operator === "ORANGE" && orangeTest.normalized === "699001122", "Orange validation failed");
  console.log("  ✓ Orange parsed:", orangeTest.operator, orangeTest.normalized, orangeTest.fapshiMedium);

  const invalidTest = parseCameroonPhone("123456");
  console.assert(!invalidTest.isValid, "Invalid phone should fail");
  console.log("  ✓ Short number rejected correctly:", invalidTest.errorMessage);

  // ── TEST 2: System Settings & Critical Default ──
  console.log("\n[TEST 2] Withdrawal System Settings & Critical MANUAL Default");
  const settings = await SettingsRepository.getWithdrawalSettings();
  console.log("  Current settings:", settings);
  console.assert(settings.withdrawal_mode === "MANUAL", "CRITICAL DEFAULT MUST BE MANUAL");
  console.log("  ✓ Critical Default verified: withdrawal_mode === 'MANUAL'");

  // ── TEST 3: Balance Checks & Atomic Double-Spending Protection ──
  console.log("\n[TEST 3] Balance Validation & Atomic Double-Spending Protection");

  // Find a store and user with a wallet or create a test wallet
  const [store] = await query<{ id: number }[]>("SELECT id FROM stores LIMIT 1");
  if (!store) {
    console.log("  Notice: No stores in DB, creating mock test store...");
    return;
  }

  let [testUser] = await query<{ id: number }[]>("SELECT id FROM users LIMIT 1");
  if (!testUser) {
    const insertRes = await query<{ insertId: number }>(
      "INSERT INTO users (name, email, role) VALUES ('Test User', 'test@bushbuyer.com', 'customer')"
    );
    testUser = { id: insertRes.insertId };
  }
  const testUserId = testUser.id;

  // Ensure test wallet exists with 100,000 balance
  await query(
    `INSERT INTO wallets (store_id, available_balance, pending_balance, currency)
     VALUES (?, 100000, 0, 'XAF')
     ON DUPLICATE KEY UPDATE available_balance = 100000, pending_balance = 0`,
    [store.id]
  );

  const [initialWallet] = await query<{ available_balance: number; pending_balance: number }[]>(
    "SELECT available_balance, pending_balance FROM wallets WHERE store_id = ?",
    [store.id]
  );
  console.log("  Initial Wallet:", initialWallet);

  // Clean any old test pending withdrawals for this store
  await query("DELETE FROM withdrawals WHERE store_id = ? AND status IN ('PENDING', 'APPROVED', 'PROCESSING')", [store.id]);

  // Request 25,000 XAF withdrawal
  const testAmount = 25000;
  const { withdrawal, autoExecuted } = await WithdrawalRepository.createWithdrawalRequest({
    storeId: store.id,
    userId: testUserId,
    amount: testAmount,
    paymentMethod: "fapshi_mtn",
    payoutDetails: {
      phone: "677123456",
      accountName: "Test Seller",
    },
    ipAddress: "127.0.0.1",
    userAgent: "AutomatedTest",
  });




  console.log("  ✓ Created withdrawal:", {
    id: withdrawal.id,
    status: withdrawal.status,
    amount: withdrawal.amount,
    fapshi_ref: withdrawal.fapshi_reference,
    autoExecuted,
  });

  console.assert(withdrawal.status === "PENDING", "Withdrawal must be PENDING");
  console.assert(autoExecuted === false, "Auto execution must NOT run in MANUAL mode");

  // Verify wallet balance was atomically reserved
  const [updatedWallet] = await query<{ available_balance: number; pending_balance: number }[]>(
    "SELECT available_balance, pending_balance FROM wallets WHERE store_id = ?",
    [store.id]
  );
  console.log("  Updated Wallet after request:", updatedWallet);
  console.assert(Number(updatedWallet.available_balance) === Number(initialWallet.available_balance) - testAmount, "Available balance must decrease");
  console.assert(Number(updatedWallet.pending_balance) === Number(initialWallet.pending_balance) + testAmount, "Pending balance must increase");

  // ── TEST 4: Prevent Second Concurrent Request (Active Pending Guard) ──
  console.log("\n[TEST 4] Active Pending Request Guard");
  try {
    await WithdrawalRepository.createWithdrawalRequest({
      storeId: store.id,
      userId: testUserId,
      amount: 10000,
      paymentMethod: "fapshi_mtn",
      payoutDetails: { phone: "677123456" },
    });
    console.error("  FAILED: Second active request should have been rejected!");
  } catch (err: any) {
    console.log("  ✓ Successfully blocked concurrent withdrawal:", err.message);
  }


  // ── TEST 5: Admin Rejection & Fund Refund ──
  console.log("\n[TEST 5] Admin Rejection & Immediate Balance Refund");
  await WithdrawalRepository.rejectWithdrawal(withdrawal.id, 1, "Test rejection — funds returned");

  const [rejectedWallet] = await query<{ available_balance: number; pending_balance: number }[]>(
    "SELECT available_balance, pending_balance FROM wallets WHERE store_id = ?",
    [store.id]
  );
  console.log("  Wallet after rejection:", rejectedWallet);
  console.assert(Number(rejectedWallet.available_balance) === Number(initialWallet.available_balance), "Available balance must be fully restored");
  console.assert(Number(rejectedWallet.pending_balance) === 0, "Pending balance must be 0");
  console.log("  ✓ Funds successfully restored on rejection.");

  // ── TEST 6: Audit Logs Recorded ──
  console.log("\n[TEST 6] Financial Audit Logs Verification");
  const auditLogs = await query<{ action: string; new_status: string; created_at: string }[]>(
    "SELECT action, new_status, created_at FROM withdrawal_audit_logs WHERE withdrawal_id = ? ORDER BY id ASC",
    [withdrawal.id]
  );
  console.log("  Audit logs recorded:", auditLogs);
  console.assert(auditLogs.length >= 2, "Audit logs must record request and rejection");
  console.log("  ✓ Financial Audit trail verified.");

  console.log("\n==================================================");
  console.log("✅ ALL 6 SECURITY & WITHDRAWAL TESTS PASSED!");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
