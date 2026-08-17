import { paymentConfig } from "@/config/payment.config";
import { env, getRequiredEnv } from "@/lib/env";

export interface PaypalCaptureResponse {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
    amount?: {
      currency_code?: string;
      value?: string;
    };
  }>;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount?: { currency_code?: string; value?: string };
        }>;
      };
      amount?: { currency_code?: string; value?: string };
    }>;
  };
}

export class PaypalProvider {
  private static get baseUrl() {
    return paymentConfig.paypal.baseUrl;
  }

  /**
   * Get a short-lived PayPal access token using client credentials.
   */
  static async getAccessToken(): Promise<string> {
    const clientId = getRequiredEnv("PAYPAL_CLIENT_ID", paymentConfig.paypal.clientId);
    const clientSecret = getRequiredEnv("PAYPAL_CLIENT_SECRET", paymentConfig.paypal.clientSecret);

    const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Failed to get PayPal access token: ${response.status}`);
    }

    const payload = (await response.json()) as { access_token: string };
    return payload.access_token;
  }

  /**
   * Capture a PayPal order server-side.
   * This is the critical server-side payment confirmation step.
   */
  static async captureOrder(
    paypalOrderId: string,
    token: string
  ): Promise<PaypalCaptureResponse> {
    const response = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal capture failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as PaypalCaptureResponse;
  }

  /**
   * Verify a PayPal webhook signature via the PayPal verify-webhook-signature API.
   * Returns true only if PayPal confirms the signature is valid.
   */
  static async verifyWebhookSignature(
    token: string,
    request: Request,
    eventBody: PayPalWebhookEvent
  ): Promise<boolean> {
    const webhookId = getRequiredEnv("PAYPAL_WEBHOOK_ID", paymentConfig.paypal.webhookId ?? env.paypalWebhookId);

    const getHeader = (key: string) =>
      request.headers.get(key) ?? request.headers.get(key.toLowerCase()) ?? "";

    const transmissionId = getHeader("paypal-transmission-id");
    const transmissionTime = getHeader("paypal-transmission-time");
    const transmissionSig = getHeader("paypal-transmission-sig");
    const certUrl = getHeader("paypal-cert-url");
    const authAlgo = getHeader("paypal-auth-algo");

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      return false;
    }

    const verifyResponse = await fetch(
      `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: eventBody,
        }),
      }
    );

    if (!verifyResponse.ok) return false;

    const verifyPayload = (await verifyResponse.json()) as { verification_status?: string };
    return verifyPayload.verification_status === "SUCCESS";
  }
}
