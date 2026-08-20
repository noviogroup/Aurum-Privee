"use client";

import { Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";

export function AddToBag({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  return (
    <button
      className={compact ? "quick-add" : "button button-primary button-full"}
      onClick={() => addItem(product)}
      disabled={product.stock < 1}
    >
      {product.stock < 1 ? "Unavailable" : compact ? "Add" : "Add to bag"}
    </button>
  );
}
