import type { ScentFamily } from "@/lib/types";
import { BRAND_EDIT } from "@/lib/brand";

export function splitProductName(itemName: string) {
  const parts = itemName.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { brand: BRAND_EDIT, name: itemName.trim() };
  return { brand: parts[0], name: parts.slice(1).join(" — ") };
}

export function familyForCategory(category: string): ScentFamily {
  const normalized = category.toLowerCase();
  if (normalized.includes("girl")) return "Gourmand";
  if (normalized.includes("women") || normalized.includes("woman")) return "Floral";
  if (/\bmen(?:'s|’s)?\b/.test(normalized) || normalized.includes("boy")) return "Woody";
  if (normalized.includes("unisex")) return "Fresh";
  return "Floral";
}

export function concentrationForName(name: string) {
  const value = name.match(/\b(EDP|EDT|EDC|Parfum|Eau de Parfum|Eau de Toilette|Cologne)\b/i)?.[0];
  return value?.toUpperCase() || "Fine fragrance";
}

export function sizeForProduct(itemName: string, optionValues: Array<string | undefined>) {
  const selectedOptions = optionValues.filter((value): value is string => Boolean(value));
  const sizeFromName = itemName.match(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|ml)\b/i)?.[0];
  return selectedOptions.join(" / ") || sizeFromName || "Standard size";
}

function compilePattern(value: string | undefined, fallback: RegExp) {
  if (!value) return fallback;
  try {
    return new RegExp(value, "i");
  } catch {
    throw new Error(`Invalid Loyverse catalog category pattern: ${value}`);
  }
}

export function isOnlineCategory(category: string) {
  const include = compilePattern(process.env.LOYVERSE_ONLINE_CATEGORY_PATTERN, /fragrance/i);
  const exclude = compilePattern(process.env.LOYVERSE_EXCLUDED_CATEGORY_PATTERN, /tester/i);
  return include.test(category) && !exclude.test(category);
}
