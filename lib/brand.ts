export const BRAND_NAME = "Aurum Privée";
export const BRAND_EDIT = "Aurum Privée Edit";
export const BRAND_TAGLINE = "Exceptional fragrance. Without boundaries.";

export function customerFacingBrand(value: string | null | undefined) {
  const brand = value?.trim() || "";
  return brand || BRAND_EDIT;
}

export function customerFacingCopy(value: string) {
  return value;
}

export function customerFacingProductName(value: string) {
  return value
    .replace(/\bSupremecy\b/gi, "Supremacy")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*0z\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\b(\d+(?:[.,]\d+)?)\s*oz\b/gi, (_, amount: string) => `${amount.replace(",", ".")} oz`)
    .replace(/\s{2,}/g, " ")
    .trim();
}
