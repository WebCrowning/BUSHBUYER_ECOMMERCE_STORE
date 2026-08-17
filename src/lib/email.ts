import nodemailer from "nodemailer";
import { env } from "@/lib/env";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return cachedTransporter;
}

function normalizeRecipients(value: string | string[]) {
  const recipients = Array.isArray(value) ? value : [value];
  return recipients.map((entry) => entry.trim()).filter(Boolean);
}

function isEmailConfigured() {
  return Boolean(env.smtpUser.trim() && env.smtpPass.trim() && env.emailFrom.trim());
}

export async function sendEmail(input: SendEmailInput) {
  const recipients = normalizeRecipients(input.to);
  if (recipients.length === 0 || !isEmailConfigured()) {
    return;
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: env.emailFrom,
    to: recipients.join(", "),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendEmailSafe(input: SendEmailInput) {
  try {
    await sendEmail(input);
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

export async function sendOrderCreatedEmails(input: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
}) {
  const base = env.siteUrl;
  await Promise.all([
    sendEmailSafe({
      to: input.customerEmail,
      subject: `Bushbuyer order ${input.orderId} received`,
      text: [
        `Hi ${input.customerName},`,
        "",
        `Your order ${input.orderId} has been received and payment was verified.`,
        `Order total: USD ${Number(input.total).toFixed(2)}`,
        `You can track your order in your dashboard: ${base}/orders`,
        "",
        "Thank you for shopping with Bushbuyer.",
      ].join("\n"),
    }),
    sendEmailSafe({
      to: env.adminEmails,
      subject: `New paid order ${input.orderId}`,
      text: [
        "A new paid order has been created.",
        `Order ID: ${input.orderId}`,
        `Customer: ${input.customerName} (${input.customerEmail})`,
        `Total: USD ${Number(input.total).toFixed(2)}`,
        `Review in admin dashboard: ${base}/admin/orders`,
      ].join("\n"),
    }),
  ]);
}

export async function sendOrderStatusChangedEmails(input: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  newStatus: string;
}) {
  const base = env.siteUrl;
  await Promise.all([
    sendEmailSafe({
      to: input.customerEmail,
      subject: `Order ${input.orderId} status updated to ${input.newStatus}`,
      text: [
        `Hi ${input.customerName},`,
        "",
        `Your order ${input.orderId} is now marked as ${input.newStatus}.`,
        `Track your order: ${base}/orders`,
      ].join("\n"),
    }),
    sendEmailSafe({
      to: env.adminEmails,
      subject: `Order ${input.orderId} status changed`,
      text: [
        `Order ${input.orderId} status was updated to ${input.newStatus}.`,
        `Customer: ${input.customerName} (${input.customerEmail})`,
        `View in admin dashboard: ${base}/admin/orders`,
      ].join("\n"),
    }),
  ]);
}

export async function sendCustomerReceivedConfirmationEmails(input: {
  orderId: string;
  customerName: string;
  customerEmail: string;
}) {
  const base = env.siteUrl;
  await Promise.all([
    sendEmailSafe({
      to: env.adminEmails,
      subject: `Customer confirmed receipt for order ${input.orderId}`,
      text: [
        `Customer ${input.customerName} confirmed package receipt.`,
        `Order ID: ${input.orderId}`,
        `Review in admin dashboard: ${base}/admin/orders`,
      ].join("\n"),
    }),
    sendEmailSafe({
      to: input.customerEmail,
      subject: `Receipt confirmation saved for order ${input.orderId}`,
      text: [
        `Hi ${input.customerName},`,
        "",
        "Thank you for confirming your package receipt.",
        `Order ID: ${input.orderId}`,
      ].join("\n"),
    }),
  ]);
}
