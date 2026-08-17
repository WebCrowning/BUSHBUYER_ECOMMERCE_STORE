import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";

type BotRequest = {
  message?: string;
};

function buildReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("refund") || text.includes("return")) {
    return "For refunds and returns, please share your order number and reason. Our team usually reviews refund requests within 24 hours.";
  }
  if (text.includes("payment") || text.includes("paypal") || text.includes("charged")) {
    return "For payment issues, include your order number and payment reference. You can also check Payment History in your dashboard for completed transactions.";
  }
  if (text.includes("ship") || text.includes("delivery") || text.includes("track")) {
    return "You can track delivery progress in My Orders. If you share your order number here, support can confirm shipping status and ETA.";
  }
  if (text.includes("login") || text.includes("password") || text.includes("account")) {
    return "For account access issues, confirm the email used to sign in and describe the error you see. We can guide recovery steps quickly.";
  }
  if (text.includes("order") || text.includes("cancel")) {
    return "For order updates, please send your order number. If the order is not yet shipped, support may help with changes or cancellation.";
  }
  return "Thanks for your message. Please include your order number (if available) and a short description of the issue. A support agent will review this chat soon.";
}

export async function POST(request: Request) {
  // Rate limit: 30 requests per minute per IP to prevent spam
  const clientIp = getClientIp(request);
  const rl = checkRateLimit({
    key: `support-bot:${clientIp}`,
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as BotRequest | null;
  // Cap message length to prevent abuse
  const message = body?.message?.trim().slice(0, 500);

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const reply = buildReply(message);
  return NextResponse.json({ reply, source: "support-bot" });
}
