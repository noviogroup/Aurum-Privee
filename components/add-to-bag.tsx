"use client";

import { Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";

export function AddToBag({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  return (
    <button
      className={compact ? "quick-add" : "button button-primary button-full"}
      onClick={(event) => addItem(product, event.currentTarget)}
      disabled={product.stock < 1}
      aria-label={product.stock < 1 ? `${product.name} is unavailable` : `Add ${product.name} to bag`}
    >
      {product.stock < 1 ? "Unavailable" : compact ? "Add" : "Add to bag"}
    </button>
  );
}
