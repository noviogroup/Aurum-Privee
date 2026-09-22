import { MAX_SAVED_FRAGRANCES, parseSavedFragranceIds, WISHLIST_STORAGE_KEY } from "@/lib/wishlist";

export const QUOTE_LIST_STORAGE_KEY = "aurum-privee-quote-list-v1";
export const MAX_QUOTE_ITEMS = MAX_SAVED_FRAGRANCES;
export const MAX_QUOTE_QUANTITY = 999;

export type QuoteListItem = { productId: string; quantity: number; note?: string };

function normalizedQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(MAX_QUOTE_QUANTITY, Math.max(1, Math.round(value)));
}

export function parseQuoteList(value: string | null): QuoteListItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const byId = new Map<string, QuoteListItem>();
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const item = candidate as Record<string, unknown>;
      if (typeof item.productId !== "string" || !item.productId || item.productId.length > 120) continue;
      const note = typeof item.note === "string" ? item.note.trim().slice(0, 500) : undefined;
      if (!byId.has(item.productId)) byId.set(item.productId, { productId: item.productId, quantity: normalizedQuantity(item.quantity), note: note || undefined });
    }
    return [...byId.values()].slice(0, MAX_QUOTE_ITEMS);
  } catch {
    return [];
  }
}

export function migrateSavedFragrances(storage: Pick<Storage, "getItem">): QuoteListItem[] {
  const current = parseQuoteList(storage.getItem(QUOTE_LIST_STORAGE_KEY));
  if (current.length) return current;
  return parseSavedFragranceIds(storage.getItem(WISHLIST_STORAGE_KEY)).map((productId) => ({ productId, quantity: 1 }));
}

export function addQuoteListItem(items: QuoteListItem[], productId: string): QuoteListItem[] {
  if (!productId || productId.length > 120 || items.some((item) => item.productId === productId)) return items;
  return [{ productId, quantity: 1 }, ...items].slice(0, MAX_QUOTE_ITEMS);
}

export function updateQuoteListItem(items: QuoteListItem[], productId: string, patch: Partial<Pick<QuoteListItem, "quantity" | "note">>) {
  return items.map((item) => item.productId !== productId ? item : {
    ...item,
    ...(patch.quantity === undefined ? {} : { quantity: normalizedQuantity(patch.quantity) }),
    ...(patch.note === undefined ? {} : { note: patch.note.trim().slice(0, 500) || undefined }),
  });
}
