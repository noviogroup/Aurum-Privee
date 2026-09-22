"use client";

import { Check, Plus } from "@phosphor-icons/react";
import { useWishlist } from "@/components/wishlist-provider";

export function SaveButton({ productId, productName, detail = false }: { productId: string; productName: string; detail?: boolean }) {
  const { hydrated, isSaved, toggleSaved } = useWishlist();
  const saved = hydrated && isSaved(productId);

  return (
    <button
      type="button"
      className={`${detail ? "save-detail-button" : "wish-button"}${saved ? " is-saved" : ""}`}
      aria-label={saved ? `Remove ${productName} from quote list` : `Add ${productName} to quote list`}
      aria-pressed={saved}
      onClick={() => toggleSaved(productId)}
    >
      {saved ? <Check size={detail ? 18 : 20} weight="bold" aria-hidden="true" /> : <Plus size={detail ? 18 : 20} weight="light" aria-hidden="true" />}
      {detail && <span>{saved ? "Added to quote list" : "Add to quote list"}</span>}
    </button>
  );
}
