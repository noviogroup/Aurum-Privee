// Keep the legacy namespace so existing saved fragrances survive the brand rename.
export const WISHLIST_STORAGE_KEY = "aurum-privee-saved-fragrances-v1";
export const MAX_SAVED_FRAGRANCES = 20;

export function parseSavedFragranceIds(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const validIds = parsed.filter(
      (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120,
    );

    return [...new Set(validIds)].slice(0, MAX_SAVED_FRAGRANCES);
  } catch {
    return [];
  }
}

export function addSavedFragranceId(ids: string[], productId: string): string[] {
  if (!productId || productId.length > 120 || ids.includes(productId)) return ids;
  return [productId, ...ids].slice(0, MAX_SAVED_FRAGRANCES);
}
