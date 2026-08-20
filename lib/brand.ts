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
