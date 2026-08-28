import { NextRequest, NextResponse } from "next/server";
import { generateSupportAiReply } from "@/lib/ai-support";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: 20 messages per minute per IP to prevent API cost abuse
  const clientIp = getClientIp(request);
  const rl = checkRateLimit({ key: `chat-ai:${clientIp}`, windowMs: 60_000, maxRequests: 20 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as { message?: string; history?: ChatMessage[] } | null;

    const rawMessage = body?.message?.trim();
    if (!rawMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Cap message length to prevent prompt-stuffing attacks
    const message = rawMessage.slice(0, 1000);
    const safeHistory = Array.isArray(body?.history)
      ? body.history
          .slice(-10)
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }))
      : [];

    const reply = await generateSupportAiReply(message, safeHistory);

    return NextResponse.json({ reply, source: "ai-chatbot" });
  } catch (error) {
    console.error("AI response error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

