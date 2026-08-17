import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

type Payload = {
  path?: string;
  referrer?: string | null;
  userAgent?: string;
  loadMs?: number | null;
};

function normalizePath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/")) {
    return "/";
  }
  return value.slice(0, 255);
}

function toSessionKey(ip: string, userAgent: string) {
  return createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";

    // Rate limit: max 60 events per minute per IP (one per second average)
    const rl = checkRateLimit({
      key: `analytics:${ip}`,
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rl.allowed) {
      // Silent 200 — don't expose rate limiting to analytics trackers
      return NextResponse.json({ ok: true });
    }

    const payload = (await request.json().catch(() => null)) as Payload | null;
    const rawPath = String(payload?.path ?? "").trim();

    if (!rawPath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const path = normalizePath(rawPath);
    const referrer = payload?.referrer ? String(payload.referrer).slice(0, 255) : null;
    const userAgent = String(payload?.userAgent || request.headers.get("user-agent") || "unknown").slice(0, 255);
    const sessionKey = toSessionKey(ip, userAgent);
    const country = request.headers.get("x-vercel-ip-country")?.slice(0, 60) || null;

    const loadMs =
      typeof payload?.loadMs === "number" && Number.isFinite(payload.loadMs) && payload.loadMs >= 0
        ? Math.round(payload.loadMs)
        : null;

    await query(
      `INSERT INTO traffic_events (path, referrer, user_agent, session_key, country, load_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [path, referrer, userAgent, sessionKey, country, loadMs],
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record traffic" }, { status: 500 });
  }
}
