"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { formatMoney } from "@/lib/config";
import { AddToBag } from "@/components/add-to-bag";
import { SaveButton } from "@/components/save-button";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 700px) 86vw, (max-width: 1100px) 45vw, 28vw" priority={priority} />
      </Link>
      <SaveButton productId={product.id} productName={product.name} />
      <div className="product-card-info">
        <div>
          <p className="product-brand">{product.brand}</p>
          <Link href={`/shop/${product.slug}`}><h3>{product.name}</h3></Link>
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
