import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-security";

type OpenRouterMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stockPackages: number;
  packageName: string;
  unitType: "pcs" | "kg";
  unitValue: number;
  description?: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category?: string;
}

async function getProductContext(): Promise<string> {
  try {
    const products = await query<Product[]>(
      "SELECT id, name, price, category, stock_packages AS stockPackages, package_name AS packageName, unit_type AS unitType, unit_value AS unitValue, description FROM products WHERE stock_packages > 0 LIMIT 20",
    );

    if (products.length === 0) {
      return "";
    }

    let context = "\nAVAILABLE PRODUCTS:\n";
    for (const product of products) {
      context += `- ${product.name} (${product.category}): $${Number(product.price).toFixed(2)} per ${product.packageName} (${Number(product.unitValue)} ${product.unitType}) - Stock: ${Number(product.stockPackages)} packages`;
      if (product.description) {
        context += ` - ${product.description}`;
      }
      context += "\n";
    }
    return context;
  } catch (err) {
    console.error("Error fetching products:", err);
    return "";
  }
}

async function getFAQContext(): Promise<string> {
  try {
    const faqs = await query<FAQ[]>("SELECT id, question, answer, category FROM faq LIMIT 10");

    if (faqs.length === 0) {
      return "";
    }

    let context = "\nCOMMON QUESTIONS & ANSWERS:\n";
    for (const faq of faqs) {
      context += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }
    return context;
  } catch (err) {
    console.error("Error fetching FAQs:", err);
    return "";
  }
}

function buildSystemPrompt(productContext: string, faqContext: string, phone1?: string, phone2?: string): string {
  let contactSection = "\nCONTACT OPTIONS (in order of preference):\n";
  contactSection += "1. OPEN DIRECT ADMIN CHAT - Use the blue 'Chat with Admin' button in the widget for immediate messaging with our admin team\n";
  if (phone1 || phone2) {
    contactSection += "2. CALL ADMIN DIRECTLY:\n";
    if (phone1) contactSection += `   - Phone 1: ${phone1}\n`;
    if (phone2) contactSection += `   - Phone 2: ${phone2}\n`;
  }
  contactSection += "3. EMAIL - support@bushbuyer.com\n";
  contactSection +=
    "\nPrioritize suggesting the admin chat feature first when customers need immediate assistance or have complex questions.\n";

  return `You are Bushbuyer's AI assistant. You help customers with questions about:
- Bushbuyer e-commerce platform (products, orders, shipping, returns)
- African raw food products (snails, dried fish, eru leaves)
- Food history and cultural significance of African ingredients
- Product origins and sourcing

RESTRICTIONS:
- ONLY answer about Bushbuyer platform and African food products
- NEVER provide medical advice or medical information
- NEVER provide recipes or meal preparation instructions
- NEVER answer about medications, treatments, or health conditions
- If asked about unrelated topics, politely redirect to platform/product topics

When you don't know something or the customer needs immediate help:
- FIRST, suggest opening a direct admin chat using the blue "Chat with Admin" button below
- Also mention the phone numbers and email as alternatives
- Always be helpful and professional
${contactSection}
Always be friendly, professional, and helpful within these bounds.
${productContext}${faqContext}`;
}

export async function POST(request: Request) {
  // Rate limit: 20 messages per minute per IP to prevent API cost abuse
  const clientIp = getClientIp(request);
  const rl = checkRateLimit({ key: `chat:${clientIp}`, windowMs: 60_000, maxRequests: 20 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const payload = (await request.json().catch(() => null)) as ChatRequest | null;

  if (!payload?.message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Cap message length to prevent prompt-stuffing attacks
  const message = String(payload.message).slice(0, 1000);

  // Cap conversation history depth and content length
  const safeHistory = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory
        .slice(-10) // max 10 prior messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }))
    : [];

  const apiKey = env.openrouterApiKey?.trim();

  try {
    if (!apiKey) {
      return NextResponse.json({
        response:
          "I can help with product availability, prices, and order updates, but AI service is temporarily unavailable. Please use the Chat with Admin button for immediate help.",
      });
    }

    // Fetch product and FAQ context
    const [productContext, faqContext] = await Promise.all([
      getProductContext(),
      getFAQContext(),
    ]);

    const systemPrompt = buildSystemPrompt(
      productContext,
      faqContext,
      env.adminPhone1,
      env.adminPhone2,
    );

    // Build message history with system prompt
    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history if provided
    if (safeHistory.length > 0) {
      for (const msg of safeHistory) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("OpenRouter API error:", error);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const aiMessage =
      data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return NextResponse.json({ response: aiMessage });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
