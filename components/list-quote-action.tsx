"use client";

import { useState } from "react";
import { Check, Plus } from "@phosphor-icons/react";
import { useWishlist } from "@/components/wishlist-provider";
import { MAX_QUOTE_QUANTITY } from "@/lib/quote-list";

export function ListQuoteAction({ productId, productName }: { productId: string; productName: string }) {
  const { items, addItem, setQuantity, removeItem, hydrated } = useWishlist();
  const item = items.find((line) => line.productId === productId);
  const [draft, setDraft] = useState<string | null>(null);
  const quantity = draft ?? String(item?.quantity ?? 1);
  return <div className="list-quote-action">
    <label><span>Qty</span><input aria-label={`Quantity for ${productName}`} type="number" inputMode="numeric" min="1" max={MAX_QUOTE_QUANTITY} value={quantity}
      onChange={(event) => { const value = event.target.value; setDraft(value); if (item && value && Number(value) >= 1 && Number(value) <= MAX_QUOTE_QUANTITY) setQuantity(productId, Number(value)); }}
      onBlur={() => { const value = Math.min(MAX_QUOTE_QUANTITY, Math.max(1, Math.round(Number(quantity) || 1))); if (item) { setQuantity(productId, value); setDraft(null); } else setDraft(String(value)); }} /></label>
    <button type="button" disabled={!hydrated} aria-label={`${item ? "Remove" : "Add"} ${productName} ${item ? "from" : "to"} quote list`} aria-pressed={Boolean(item)}
      onClick={() => item ? removeItem(productId) : addItem(productId, Number(quantity))}>
      {item ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}<span>{item ? "Added" : "Add to quote"}</span>
    </button>
  </div>;
}
