"use client";

import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@/lib/types";
import { SaveButton } from "@/components/save-button";
import { productVariantLabel } from "@/lib/product-variants";

export function ProductCard({ product, priority = false, headingLevel = 3, listView = false, mobileImage }: { product: PublicProduct; priority?: boolean; headingLevel?: 2 | 3; listView?: boolean; mobileImage?: string }) {
  const ProductHeading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        {mobileImage ? (
          <picture className="product-card-picture">
            <source media="(max-width: 767px)" srcSet={mobileImage} />
            <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 700px) 72vw, (max-width: 1100px) 45vw, 28vw" priority={priority} />
          </picture>
        ) : (
          <Image src={product.image} alt={product.imageAlt} fill sizes={listView ? "64px" : "(max-width: 700px) 86vw, (max-width: 1100px) 45vw, 28vw"} priority={priority} />
        )}
      </Link>
      <SaveButton productId={product.id} productName={product.name} showLabel={listView} />
      <div className="product-card-info">
        <div>
          <p className="product-brand">{product.brand}</p>
          <Link href={`/shop/${product.slug}`}><ProductHeading>{product.name}</ProductHeading></Link>
          <p>{productVariantLabel(product)}</p>
        </div>
      </div>
    </article>
  );
}
