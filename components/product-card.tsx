"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { formatMoney } from "@/lib/config";
import { AddToBag } from "@/components/add-to-bag";
import { SaveButton } from "@/components/save-button";

export function ProductCard({ product, priority = false, headingLevel = 3 }: { product: Product; priority?: boolean; headingLevel?: 2 | 3 }) {
  const ProductHeading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 700px) 86vw, (max-width: 1100px) 45vw, 28vw" priority={priority} />
      </Link>
      <SaveButton productId={product.id} productName={product.name} />
      <div className="product-card-info">
        <div>
          <p className="product-brand">{product.brand}</p>
          <Link href={`/shop/${product.slug}`}><ProductHeading>{product.name}</ProductHeading></Link>
          <p>{product.concentration}, {product.size}</p>
        </div>
        <div className="product-price">
          <strong>{formatMoney(product.price)}</strong>
          <AddToBag product={product} compact />
        </div>
      </div>
    </article>
  );
}
