"use client";

import { Heart } from "@phosphor-icons/react";
import { useWishlist } from "@/components/wishlist-provider";

export function SaveButton({ productId, productName, detail = false }: { productId: string; productName: string; detail?: boolean }) {
  const { hydrated, isSaved, toggleSaved } = useWishlist();
  const saved = hydrated && isSaved(productId);

  return (
    <button
      type="button"
      className={`${detail ? "save-detail-button" : "wish-button"}${saved ? " is-saved" : ""}`}
      aria-label={saved ? `Remove ${productName} from saved fragrances` : `Save ${productName}`}
      aria-pressed={saved}
      onClick={() => toggleSaved(productId)}
    >
      <Heart size={detail ? 18 : 20} weight={saved ? "fill" : "light"} aria-hidden="true" />
      {detail && <span>{saved ? "Saved" : "Save for later"}</span>}
    </button>
  );
}
