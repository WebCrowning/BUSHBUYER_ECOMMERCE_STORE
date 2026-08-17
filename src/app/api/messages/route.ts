import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { createAdminNotification } from "@/lib/notifications";
import { messageSchema } from "@/lib/validation";
import { validateSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const session = await auth();
  const payload = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const userName = session?.user?.name ?? "A customer";

    await query(
      "INSERT INTO messages (user_id, customer_email, message, status) VALUES (?, ?, ?, 'Open')",
      [session?.user?.id ? Number(session.user.id) : null, parsed.data.email.toLowerCase(), parsed.data.message],
    );

    await createAdminNotification({
      type: "contact",
      title: "New customer message",
      body: `${userName} sent a new contact message.`,
      link: "/admin/messages",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
