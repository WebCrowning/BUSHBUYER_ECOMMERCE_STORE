/**
 * Cameroon Mobile Phone & Operator Validation Helper
 * Normalizes numbers and identifies MTN MoMo vs Orange Money for Fapshi Payouts.
 */

export type CameroonOperator = "MTN" | "ORANGE" | "NEXTTEL" | "CAMTEL" | "UNKNOWN";
export type FapshiMedium = "mobile money" | "orange money" | "fapshi";

export interface CameroonPhoneInfo {
  isValid: boolean;
  raw: string;
  normalized: string; // 9-digit local string e.g. "677123456"
  international: string; // "+237677123456"
  operator: CameroonOperator;
  fapshiMedium: FapshiMedium | null;
  errorMessage?: string;
}

export function parseCameroonPhone(rawInput: string): CameroonPhoneInfo {
  const clean = String(rawInput || "").trim();

  // Remove spaces, hyphens, parentheses, plus
  let digits = clean.replace(/\D/g, "");

  // If prefixed with 237 (or 00237), strip 237
  if (digits.startsWith("00237")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("237") && digits.length === 12) {
    digits = digits.slice(3);
  }

  // Cameroon mobile numbers are exactly 9 digits
  if (digits.length !== 9) {
    return {
      isValid: false,
      raw: clean,
      normalized: digits,
      international: `+237${digits}`,
      operator: "UNKNOWN",
      fapshiMedium: null,
      errorMessage: `Cameroon phone number must be 9 digits (received ${digits.length}). Example: 677 12 34 56`,
    };
  }

  // Identify operator based on Cameroon numbering plan (ART):
  // MTN: 67x, 68x, 650-654
  // Orange: 69x, 655-659
  // Nexttel: 66x
  // Camtel: 62x, 24x, 22x, 23x

  const prefix2 = digits.slice(0, 2);
  const prefix3 = parseInt(digits.slice(0, 3), 10);

  let operator: CameroonOperator = "UNKNOWN";
  let fapshiMedium: FapshiMedium | null = null;

  if (prefix2 === "67" || prefix2 === "68" || (prefix3 >= 650 && prefix3 <= 654)) {
    operator = "MTN";
    fapshiMedium = "mobile money";
  } else if (prefix2 === "69" || (prefix3 >= 655 && prefix3 <= 659)) {
    operator = "ORANGE";
    fapshiMedium = "orange money";
  } else if (prefix2 === "66") {
    operator = "NEXTTEL";
  } else if (prefix2 === "62" || prefix2 === "22" || prefix2 === "23" || prefix2 === "24") {
    operator = "CAMTEL";
  }

  if (operator === "UNKNOWN") {
    return {
      isValid: false,
      raw: clean,
      normalized: digits,
      international: `+237${digits}`,
      operator: "UNKNOWN",
      fapshiMedium: null,
      errorMessage: "Invalid Cameroon mobile prefix. Must start with 67, 68, 69, or 65.",
    };
  }

  return {
    isValid: true,
    raw: clean,
    normalized: digits,
    international: `+237${digits}`,
    operator,
    fapshiMedium,
  };
}

/**
 * Masks phone number for secure display (e.g. "+237 677 ••• •56")
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "—";
  const str = phone.replace(/\s+/g, "");
  if (str.length <= 4) return str;
  const start = str.slice(0, str.length - 4);
  const end = str.slice(-2);
  return `${start.slice(0, 4)} ••• •${end}`;
}
