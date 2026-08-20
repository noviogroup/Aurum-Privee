export const BRAND_NAME = "Aurum Privée";
export const BRAND_EDIT = "Aurum Privée Edit";
export const BRAND_TAGLINE = "Exceptional fragrance. Without boundaries.";

const retiredBrandPattern = /^lola lily(?: selection| edit)?$/i;

export function customerFacingBrand(value: string | null | undefined) {
  const brand = value?.trim() || "";
  return retiredBrandPattern.test(brand) ? BRAND_EDIT : brand || BRAND_EDIT;
}

export function customerFacingCopy(value: string) {
  return value.replace(/Lola Lily/gi, BRAND_NAME);
}
