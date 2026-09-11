import Link from "next/link";
import { formatMoney } from "@/lib/config";
import { productVariantLabel } from "@/lib/product-variants";
import type { Product } from "@/lib/types";

export function ProductVariantOptions({ current, variants }: { current: Product; variants: Product[] }) {
  if (variants.length < 2) return null;

  return (
    <section className="product-variant-options" aria-labelledby="product-options-title">
      <div className="product-variant-options-heading">
        <h2 id="product-options-title">Choose your edition</h2>
        <span>{variants.length} options</span>
      </div>
      <div className="product-variant-option-list">
        {variants.map((variant) => (
          <Link
            className={variant.id === current.id ? "is-selected" : ""}
            href={`/shop/${variant.slug}`}
            key={variant.id}
            aria-current={variant.id === current.id ? "page" : undefined}
          >
            <span>{productVariantLabel(variant)}</span>
            <strong>{formatMoney(variant.price)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
