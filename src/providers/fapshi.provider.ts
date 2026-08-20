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

  /**
   * Verify Fapshi webhook signature using HMAC-SHA256.
   * Fapshi signs the raw payload body with the webhookSecret.
   * Returns true if the signature matches.
   */
  static verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const secret = paymentConfig.fapshi.webhookSecret;
    if (!secret) {
      console.warn("[FapshiProvider] FAPSHI_WEBHOOK_SECRET not set — rejecting unsigned webhook.");
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
