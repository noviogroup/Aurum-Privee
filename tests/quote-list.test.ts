import assert from "node:assert/strict";
import test from "node:test";
import { addQuoteListItem, MAX_QUOTE_ITEMS, migrateSavedFragrances, parseQuoteList, updateQuoteListItem } from "@/lib/quote-list";
import { WISHLIST_STORAGE_KEY } from "@/lib/wishlist";

test("quote list validates, deduplicates and bounds lines", () => {
  const values = Array.from({ length: MAX_QUOTE_ITEMS + 3 }, (_, index) => ({ productId: `p-${index}`, quantity: index + 1, note: " buyer note " }));
  const result = parseQuoteList(JSON.stringify([values[0], values[0], { productId: "", quantity: 2 }, ...values.slice(1)]));
  assert.equal(result.length, MAX_QUOTE_ITEMS);
  assert.equal(new Set(result.map((line) => line.productId)).size, result.length);
  assert.equal(result[0].note, "buyer note");
});

test("legacy saved fragrances migrate into quantity-one quote lines", () => {
  const storage = { getItem: (key: string) => key === WISHLIST_STORAGE_KEY ? JSON.stringify(["one", "two"]) : null };
  assert.deepEqual(migrateSavedFragrances(storage), [{ productId: "one", quantity: 1 }, { productId: "two", quantity: 1 }]);
});

test("quote list additions and edits keep bounded quantities and notes", () => {
  const added = addQuoteListItem([], "product-1");
  assert.deepEqual(updateQuoteListItem(added, "product-1", { quantity: 5000, note: "  urgent  " }), [{ productId: "product-1", quantity: 999, note: "urgent" }]);
});
