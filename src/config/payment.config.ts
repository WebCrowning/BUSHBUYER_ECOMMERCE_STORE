export const paymentConfig = {
  paypal: {
    baseUrl: process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com",
    clientId: process.env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    merchantEmail: process.env.PAYPAL_MERCHANT_EMAIL ?? "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  },
  fapshi: {
    baseUrl: process.env.FAPSHI_BASE_URL ?? "https://sandbox.fapshi.com",
    apiUser: process.env.FAPSHI_API_USER ?? "",
    apiKey: process.env.FAPSHI_API_KEY ?? "",
    webhookSecret: process.env.FAPSHI_WEBHOOK_SECRET ?? "",
    // Dedicated disbursement service credentials (fallback to primary if not distinct)
    payoutApiUser: process.env.FAPSHI_PAYOUT_API_USER || process.env.FAPSHI_API_USER || "",
    payoutApiKey: process.env.FAPSHI_PAYOUT_API_KEY || process.env.FAPSHI_API_KEY || "",
    payoutWebhookSecret: process.env.FAPSHI_PAYOUT_WEBHOOK_SECRET || process.env.FAPSHI_WEBHOOK_SECRET || "",
    usdToXafRate: Number(process.env.USD_TO_XAF_RATE ?? 600),
  },
  commissions: {
    defaultRatePercentage: Number(process.env.DEFAULT_COMMISSION_RATE ?? 10.0),
  },
};
