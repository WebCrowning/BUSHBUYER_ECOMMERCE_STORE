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
  },
  commissions: {
    defaultRatePercentage: Number(process.env.DEFAULT_COMMISSION_RATE ?? 10.0),
  },
};
