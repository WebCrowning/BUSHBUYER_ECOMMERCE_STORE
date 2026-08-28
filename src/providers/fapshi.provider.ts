import { paymentConfig } from "@/config/payment.config";
import {
  FapshiPaymentRequest,
  FapshiPaymentResponse,
  FapshiTransactionStatus,
} from "@/types/marketplace";
import { createHmac } from "crypto";

export class FapshiProvider {
  private static get baseUrl() {
    return paymentConfig.fapshi.baseUrl;
  }

  private static get headers() {
    return {
      "Content-Type": "application/json",
      apiuser: paymentConfig.fapshi.apiUser,
      apikey: paymentConfig.fapshi.apiKey,
    };
  }

  /**
   * Initiate a Fapshi payment request.
   * Returns a redirect link and transId for the customer.
   */
  static async initiate(req: FapshiPaymentRequest): Promise<FapshiPaymentResponse> {
    const url = `${this.baseUrl}/initiate-pay`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        amount: req.amount,
        email: req.email,
        externalId: req.externalId,
        redirectUrl: req.redirectUrl,
        message: req.message || `Order Payment for ${req.externalId}`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fapshi payment initiation failed (${res.status}): ${errText}`);
    }

    return (await res.json()) as FapshiPaymentResponse;
  }

  /**
   * Check the status of a Fapshi transaction by transId.
   * Used for server-side verification on success redirect.
   */
  static async verifyTransaction(transId: string): Promise<FapshiTransactionStatus> {
    const url = `${this.baseUrl}/payment-status/${transId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fapshi transaction status check failed (${res.status}): ${errText}`);
    }

    return (await res.json()) as FapshiTransactionStatus;
  }

  private static get payoutHeaders() {
    return {
      "Content-Type": "application/json",
      apiuser: paymentConfig.fapshi.payoutApiUser,
      apikey: paymentConfig.fapshi.payoutApiKey,
    };
  }

  /**
   * Initiate a Fapshi payout / disbursement request.
   * Sends funds directly to user's MTN MoMo, Orange Money, or Fapshi account.
   */
  static async payout(req: {
    amount: number;
    phone?: string;
    email?: string;
    medium: "mobile money" | "orange money" | "fapshi";
    externalId: string;
    message?: string;
  }): Promise<{ message: string; transId?: string; dateInitiated?: string; statusCode?: number }> {
    const url = `${this.baseUrl}/payout`;

    const bodyPayload: Record<string, any> = {
      amount: Math.round(req.amount), // Integer XAF amount
      medium: req.medium,
      externalId: req.externalId,
      message: req.message || `Payout for withdrawal #${req.externalId}`,
    };

    if (req.medium === "fapshi") {
      if (!req.email) throw new Error("Email is required for Fapshi wallet payout");
      bodyPayload.email = req.email;
    } else {
      if (!req.phone) throw new Error("Phone number is required for Mobile Money payout");
      bodyPayload.phone = req.phone;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.payoutHeaders,
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));

      if (!res.ok) {
        throw new Error(data.message || `Fapshi payout failed (${res.status})`);
      }

      return data;
    } catch (err: any) {
      console.error("[FapshiProvider.payout] Exception:", err);
      throw err;
    }
  }

  /**
   * Check status of a transaction / payout by transId.
   */
  static async checkPayoutStatus(transId: string): Promise<FapshiTransactionStatus> {
    const url = `${this.baseUrl}/payment-status/${encodeURIComponent(transId)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: this.payoutHeaders,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fapshi payout status check failed (${res.status}): ${errText}`);
    }

    return (await res.json()) as FapshiTransactionStatus;
  }

  /**
   * Verify Fapshi webhook signature using HMAC-SHA256.
   * Fapshi signs the raw payload body with the webhookSecret.
   * Returns true if the signature matches.
   */
  static verifyWebhookSignature(rawBody: string, signatureHeader: string, isPayout = false): boolean {
    const secret = isPayout
      ? paymentConfig.fapshi.payoutWebhookSecret || paymentConfig.fapshi.webhookSecret
      : paymentConfig.fapshi.webhookSecret;

    if (!secret) {
      console.warn("[FapshiProvider] Webhook secret not set — rejecting unsigned webhook.");
      return false;
    }

    try {
      if (signatureHeader && signatureHeader.trim() === secret.trim()) {
        return true;
      }

      const expectedSig = createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

      // Constant-time comparison to prevent timing attacks
      const sigBuffer = Buffer.from(signatureHeader || "", "hex");
      const expectedBuffer = Buffer.from(expectedSig, "hex");

      if (sigBuffer.length !== expectedBuffer.length) return false;

      let diff = 0;
      for (let i = 0; i < sigBuffer.length; i++) {
        diff |= sigBuffer[i] ^ expectedBuffer[i];
      }
      return diff === 0;
    } catch {
      return false;
    }
  }
}
