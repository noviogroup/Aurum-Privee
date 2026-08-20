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
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/shop/${product.slug}`,
      priceCurrency: siteConfig.currency,
      price: product.price.toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
