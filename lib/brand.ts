export const BRAND_NAME = "Aurum Privée";
export const BRAND_EDIT = "Aurum Privée Edit";
export const BRAND_TAGLINE = "Exceptional fragrance. Without boundaries.";

const canonicalBrands: Record<string, string> = {
  "christian dior": "Dior",
  "parfums christian dior": "Dior",
  "afnan perfumes": "Afnan",
  "antorio banderas": "Antonio Banderas",
  "arianna grande": "Ariana Grande",
  "dolce & gabanna": "Dolce & Gabbana",
  "jean paul glautier": "Jean Paul Gaultier",
  "mont blanc": "Montblanc",
};

export function customerFacingBrand(value: string | null | undefined) {
  const brand = value?.replace(/\s+/g, " ").trim() || "";
  return canonicalBrands[brand.toLowerCase()] || brand || BRAND_EDIT;
}

export function customerFacingCopy(value: string) {
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function customerFacingConcentration(value: string | null | undefined) {
  const concentration = (value || "").trim().toUpperCase();
  if (concentration === "EDP" || concentration === "EAU DE PARFUM") return "Eau de Parfum";
  if (concentration === "EDT" || concentration === "EAU DE TOILETTE") return "Eau de Toilette";
  if (concentration === "EDC" || concentration === "EAU DE COLOGNE" || concentration === "COLOGNE") return "Eau de Cologne";
  if (concentration === "PARFUM") return "Parfum";
  return value?.trim() || "Fine fragrance";
}

export function customerFacingProductName(value: string, brand?: string) {
  let name = value
    .replace(/\bSupremecy\b/gi, "Supremacy")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*0z\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\b(\d+(?:[.,]\d+)?)\s*oz\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\s{2,}/g, " ")
    .trim();

  const brandWords = (brand || "").split(/\s+/).filter(Boolean);
  const aliases = Object.entries(canonicalBrands)
    .filter(([, canonical]) => canonical.toLowerCase() === brand?.toLowerCase())
    .map(([alias]) => alias);
  const prefixes = [brand, ...aliases, brandWords.length > 1 ? brandWords.at(-1) : undefined]
    .filter((prefix): prefix is string => Boolean(prefix))
    .sort((left, right) => right.length - left.length);
  for (const prefix of prefixes) {
    const remainder = name.slice(prefix.length);
    if (name.toLowerCase().startsWith(prefix.toLowerCase()) && /^(?:\s*[-/]\s*|\s+)/.test(remainder)) {
      name = remainder.replace(/^(?:\s*[-/]\s*|\s+)/, "").trim();
      break;
    }
  }

  if (!brand) return name;

  return name
    .replace(/\s+\d+(?:\.\d+)?\s*(?:fl\.?\s*)?oz\b.*$/i, "")
    .replace(/\s+\d+(?:\.\d+)?\s+(?=(?:EDP|EDT|EDC|Parfum|Cologne)\b).*$/i, "")
    .replace(/\s+(?:Extrait de Parfum|Eau de Parfum|Eau de Toilette|Eau de Cologne|EDP|EDT|EDC|Parfum|Cologne)(?:\s+Spray)?(?:\s+SP)?$/i, "")
    .replace(/\s+(?:Women|Woman|Men|Unisex|Pour Femme|Pour Homme)$/i, "")
    .replace(/\s+SP$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function customerFacingSize(value: string | null | undefined, productName: string) {
  const normalized = (value || "")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*0z\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\b(\d+(?:[.,]\d+)?)\s*oz\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (normalized && !/^standard size$/i.test(normalized)) return normalized;
  const explicit = productName.match(/\b(\d+(?:[.,]\d+)?)\s*(?:fl\.?\s*)?oz\b/i)?.[1];
  const beforeConcentration = productName.match(/\b(\d+(?:[.,]\d+)?)\s+(?=(?:EDP|EDT|EDC|Parfum|Cologne)\b)/i)?.[1];
  const afterConcentration = productName.match(/\b(?:EDP|EDT|EDC|Parfum|Cologne)\b[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(?:oz)?(?:\s*SP)?\s*$/i)?.[1];
  const amount = explicit || beforeConcentration || afterConcentration;
  return amount ? `${amount.replace(",", ".")} oz` : "Size not specified";
}
