import { env } from "@/lib/env";
import { query } from "@/lib/db";

interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

type CatalogItem = {
  name: string;
  category: string | null;
  price: number | string;
  packageName: string;
  unitType: "pcs" | "kg";
  unitValue: number | string;
};

async function getCatalogItems(): Promise<CatalogItem[]> {
  try {
    return await query<CatalogItem[]>(
      `SELECT name, category, price, package_name AS packageName, unit_type AS unitType, unit_value AS unitValue
       FROM products
       WHERE store_id = 0 AND stock_packages > 0
       ORDER BY featured DESC, created_at DESC
       LIMIT 20`,
    );
  } catch {
    return [];
  }
}

async function getCatalogContext(): Promise<string> {
  try {
    const rows = await getCatalogItems();

    if (!rows.length) {
      return "No products are currently listed in the catalog.";
    }

    // Group products by category with clean formatting
    const grouped: Record<string, CatalogItem[]> = {};
    rows.forEach((item) => {
      const cat = (item.category || "General").trim();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Build structured catalog
    const catalogLines = Object.entries(grouped)
      .map(([category, items]) => {
        const productNames = items
          .slice(0, 4)
          .map((p) => `${p.name} ($${Number(p.price).toFixed(2)} per ${p.packageName} - ${Number(p.unitValue)} ${p.unitType})`)
          .join(", ");
        return `**${category}:** ${productNames}`;
      })
      .join("\n");

    return `Our current product catalog:\n${catalogLines}\n\nWe specialize in authentic African raw foods sourced directly from trusted suppliers.`;
  } catch {
    return "Catalog context unavailable right now. Use only known Bushbuyer raw food context.";
  }
}

function buildProductListReply(items: CatalogItem[]): string {
  if (!items.length) {
    return "Current catalog is temporarily unavailable. Please message admin for the latest stock list.";
  }

  const grouped = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const category = (item.category || "General").trim() || "General";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)?.push(item);
  }

  const lines: string[] = ["Here is our current product list:"];
  for (const [category, rows] of grouped.entries()) {
    for (const row of rows.slice(0, 3)) {
      lines.push(
        `- ${category}: ${row.name} ($${Number(row.price).toFixed(2)} per ${row.packageName})`,
      );
    }
  }

  lines.push("Tell me the exact item you want and I will confirm availability.");
  return lines.join("\n");
}

function isGreetingOnly(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b[!.?]*$/.test(normalized);
}

function asksForProductList(message: string): boolean {
  const text = message.toLowerCase();
  return /(what\s+(do\s+you\s+have|products|items)|product\s+list|catalog|available\s+products)/.test(text);
}

function asksAdminOnline(message: string): boolean {
  const text = message.toLowerCase();
  return /(admin\s+online|is\s+the\s+admin\s+online|are\s+admins\s+online|admin\s+available)/.test(text);
}

function asksForAdmin(message: string): boolean {
  const text = message.toLowerCase();
  return /(talk\s+with\s+admin|speak\s+to\s+admin|connect\s+me\s+to\s+admin|need\s+admin|want\s+admin)/.test(text);
}

async function getAdminOnlineReply(): Promise<string> {
  try {
    const rows = await query<Array<{ onlineCount: number }>>(
      "SELECT COUNT(*) AS onlineCount FROM admin_online_status WHERE status = 'online'",
    );
    const online = Number(rows[0]?.onlineCount ?? 0) > 0;
    return online
      ? "Yes, an admin is online now. Send your message here and the admin can take over shortly."
      : "No admin is currently online. You can continue here with AI support, or type '@admin' and I will escalate your request.";
  } catch {
    return "I cannot confirm live admin status right now. Type '@admin' and I will escalate your request immediately.";
  }
}

function enforceBushbuyerDomain(reply: string): string {
  // If AI mentions "try elsewhere" or similar, replace with admin escalation
  const sendAwayPattern = /try\s+(elsewhere|somewhere\s+else|other)/i;
  if (sendAwayPattern.test(reply)) {
    return "Let me connect you with our team for that — they can help with inventory or special requests. Our admin will reply shortly.";
  }

  // Any response mentioning completely unrelated categories gets escalated
  const outOfScopePattern = /\b(electronics?|phones?|laptops?|fashion|clothing|home\s*&\s*garden|furniture|gaming|cars?|bikes?)\b/i;
  if (outOfScopePattern.test(reply)) {
    return "Let me connect you with our team — they can clarify what we have. Our admin will reply shortly.";
  }

  return reply.trim();
}

function formatSupportReply(userMessage: string, rawReply: string): string {
  let reply = rawReply
    // Remove markdown emphasis that looks noisy in chat bubbles.
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\r/g, "")
    .trim();

  // Avoid bulky scripted welcome blocks unless the user greeted first.
  const userGreeted = /\b(hello|hi|hey|good\s*(morning|afternoon|evening))\b/i.test(userMessage);
  if (!userGreeted) {
    reply = reply.replace(
      /^hello\s+and\s+welcome\s+to\s+Bushbuyer[^.!?]*[.!?]\s*/i,
      "",
    );
  }

  // Keep line breaks readable and remove trailing filler question.
  reply = reply
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s*is\s+there\s+a\s+specific\s+product\s+you'?re\s+interested\s+in\??\s*$/i, "")
    .trim();

  const lines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Limit verbosity in chat bubbles.
  const capped = lines.slice(0, 8);
  let cleaned = capped.join("\n");

  if (cleaned.length > 700) {
    cleaned = `${cleaned.slice(0, 697).trimEnd()}...`;
  }

  return cleaned || "I can help with product availability, pricing, shipping, and orders. Tell me what item you need.";
}

function enforceAdminEscalationWhenUncertain(reply: string): string {
  if (/@admin/i.test(reply)) {
    return reply;
  }

  const uncertainPattern = /\b(cannot|can't|unable|not sure|uncertain|do not have|don't have|can't confirm)\b/i;
  const handoffPattern = /\b(admin|team|escalate|contact\s+admin)\b/i;

  if (uncertainPattern.test(reply) && handoffPattern.test(reply)) {
    return `@admin requested. ${reply}`;
  }

  return reply;
}

function handleDirectBusinessFacts(message: string): string | null {
  const text = message.toLowerCase();

  if (/\b(founder|founded by|owner|ceo|who made|who created)\b/.test(text)) {
    return "I do not have verified founder details in this project data. Please contact store admin for official founder information.";
  }

  return null;
}

export async function generateSupportAiReply(
  message: string,
  history: AiChatMessage[] = [],
): Promise<string> {
  if (!message.trim()) {
    throw new Error("Message is required");
  }

  if (!env.openrouterApiKey) {
    throw new Error("AI service not configured");
  }

  const directFact = handleDirectBusinessFacts(message);
  if (directFact) {
    return directFact;
  }

  if (isGreetingOnly(message)) {
    return "Hello. Welcome to Bushbuyer. Tell me the ingredient you need, and I will check our available products.";
  }

  if (asksAdminOnline(message)) {
    return getAdminOnlineReply();
  }

  if (asksForAdmin(message)) {
    return "@admin requested. I have escalated your chat to admin. Please share your exact request, and the admin will respond as soon as possible.";
  }

  if (asksForProductList(message)) {
    const items = await getCatalogItems();
    return buildProductListReply(items);
  }

  const catalogContext = await getCatalogContext();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openrouterApiKey}`,
      "HTTP-Referer": env.siteUrl,
      "X-Title": "Bushbuyer Support",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openrouterModel,
      messages: [
        {
          role: "system",
          content: `You are a helpful customer support assistant for Bushbuyer, an African raw food marketplace specializing in authentic, fresh ingredients.

YOUR TONE: Professional, friendly, concise. Help customers find what they need.

RESPONSE STYLE:
1. Answer the customer's question directly and clearly
2. If discussing products, reference the live catalog below with specific names and prices
3. Use short plain-text bullet points for multiple items (no markdown symbols like **)
4. Be specific: mention actual product names (e.g., "Premium Dried Fish", "Fresh African Snails", "Eru Leaves")
5. Keep responses concise: max 5 short lines

PRODUCT INFO:
${catalogContext}

WHEN CUSTOMER ASKS ABOUT:
📦 "What products do you have?" → List our categories and 2-3 specific items per category with prices
📦 "Do you have [item]?" → Check if it matches our catalog. If uncertain, acknowledge and say admin will confirm
🔍 "I'm looking for..." → Ask what category interests them (Seafood, Protein, Vegetables) or describe what they need
💬 "Do you have specific items?" → Say "Yes, we have [specific items]. What would you like?"

CRITICAL RULES:
- NEVER say "let me ask our team" unless you truly cannot answer from the catalog
- ALWAYS reference actual products by name when listing
- NEVER send customers elsewhere—we handle everything
- If user asks for admin, respond with: "@admin requested. I have escalated your chat to admin."
- DO NOT start every reply with long greetings or welcome paragraphs
- DO NOT include markdown formatting (no **bold**, no headings)
- If customer needs something special: "We have a range of authentic items. Our team can help source specific requests—would you like me to connect you with admin?"
- Stop after answering. No unnecessary follow-ups.`,
        },
        ...history,
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const reply =
    data.choices?.[0]?.message?.content?.trim() ||
    "I couldn't generate a response. Please try again.";

  const cleaned = formatSupportReply(
    message,
    enforceAdminEscalationWhenUncertain(enforceBushbuyerDomain(reply)),
  );

  return cleaned;
}
