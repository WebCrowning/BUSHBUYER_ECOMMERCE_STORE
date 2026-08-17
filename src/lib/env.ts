export const env = {
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  dbHost: process.env.MYSQL_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.MYSQL_PORT ?? 3306),
  dbUser: process.env.MYSQL_USER ?? "root",
  dbPassword: process.env.MYSQL_PASSWORD ?? "",
  dbName: process.env.MYSQL_DATABASE ?? "Bushbuyer",
  paypalBaseUrl:
    process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com",
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  paypalMerchantEmail: process.env.PAYPAL_MERCHANT_EMAIL ?? "",
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  smtpUser: process.env.EMAIL_SMTP_USER ?? "",
  smtpPass: process.env.EMAIL_SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "openrouter/auto",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  adminPhone1: process.env.ADMIN_PHONE_1 ?? "",
  adminPhone2: process.env.ADMIN_PHONE_2 ?? "",
  /** Public site URL used in emails and share links. Falls back to NEXTAUTH_URL then localhost. */
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
};

export function getRequiredEnv(name: string, value: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
