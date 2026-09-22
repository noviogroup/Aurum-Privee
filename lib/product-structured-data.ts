import type { Product } from "@/lib/types";
import { siteConfig } from "@/lib/config";

export function productStructuredData(product: Product) {
  const image = new URL(product.image, siteConfig.url).toString();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [image],
    sku: product.loyverseVariantId || product.id,
    brand: { "@type": "Brand", name: product.brand },
    category: `${product.family} fragrance`,
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
