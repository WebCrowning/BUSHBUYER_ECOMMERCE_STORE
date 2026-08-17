import { env } from "@/lib/env";

export class AiService {
  static async generateProductDescription(name: string, category: string, keyFeatures?: string): Promise<string> {
    if (!env.openrouterApiKey) {
      return `${name} - High quality ${category} item. Key features: ${keyFeatures || "Authentic quality"}.`;
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.openrouterModel,
          messages: [
            {
              role: "system",
              content: "You are an expert e-commerce copywriter. Generate compelling, SEO-optimized product descriptions.",
            },
            {
              role: "user",
              content: `Write a compelling description for product: "${name}" in category: "${category}". Key features: ${keyFeatures || "Authentic quality"}.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || `${name} - High quality ${category} item.`;
      }
    } catch {
      // Fallback
    }

    return `${name} - High quality ${category} item. Key features: ${keyFeatures || "Authentic quality"}.`;
  }

  static async analyzeOrderFraudRisk(orderId: number, totalAmount: number, country: string): Promise<{
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High";
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let riskScore = 10;

    if (totalAmount > 1000) {
      riskScore += 25;
      reasons.push("High transaction value above $1,000");
    }

    if (!country || country.length < 2) {
      riskScore += 20;
      reasons.push("Incomplete country location details");
    }

    const riskLevel = riskScore > 60 ? "High" : riskScore > 30 ? "Medium" : "Low";

    return { riskScore, riskLevel, reasons };
  }
}
