import type { Product, PublicProduct } from "@/lib/types";

export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    name: product.name,
    concentration: product.concentration,
    size: product.size,
    description: product.description,
    audience: product.audience,
    family: product.family,
    notes: product.notes,
    detailsSource: product.detailsSource,
    image: product.image,
    imageAlt: product.imageAlt,
    featured: product.featured,
    newArrival: product.newArrival,
  };
}

export function toPublicCatalog<T extends { products: Product[]; total: number }>(catalog: T) {
  return { products: catalog.products.map(toPublicProduct), total: catalog.total };
}
