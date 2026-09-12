import { POST as handleFapshiWebhook } from "@/app/api/payments/fapshi/webhook/route";
import { NextResponse } from "next/server";

/**
 * Webhook handler for https://bushbuyer.com/webhook
 * Receives live transaction notifications from Fapshi with header x-wh-secret
 */
export async function POST(req: Request) {
  return handleFapshiWebhook(req);
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Bushbuyer Fapshi Webhook",
    message: "Webhook endpoint is live and accepting POST requests.",
  });
}
